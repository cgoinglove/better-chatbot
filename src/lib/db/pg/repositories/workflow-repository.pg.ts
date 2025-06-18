import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { pgDb } from "../db.pg";
import {
  WorkflowEdgeSchema,
  WorkflowNodeSchema,
  WorkflowSchema,
} from "../schema.pg";
import {
  WorkflowDB,
  WorkflowEdgeDB,
  WorkflowRepository,
} from "app-types/workflow";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { exclude } from "lib/utils";
import { Edge } from "@xyflow/react";
import { generateUINode } from "@/components/workflow/shared";

export const pgWorkflowRepository: WorkflowRepository = {
  async checkAccess(workflowId, userId) {
    const [workflow] = await pgDb
      .select({
        visibility: WorkflowSchema.visibility,
        userId: WorkflowSchema.userId,
      })
      .from(WorkflowSchema)
      .where(and(eq(WorkflowSchema.id, workflowId)));
    if (!workflow) {
      return false;
    }
    if (workflow.visibility === "private" && workflow.userId !== userId) {
      return false;
    }
    return true;
  },
  async delete(id) {
    const result = await pgDb
      .delete(WorkflowSchema)
      .where(eq(WorkflowSchema.id, id));
    if (result.rowCount === 0) {
      throw new Error("Workflow not found");
    }
  },
  async selectByUserId(userId) {
    const rows = await pgDb
      .select()
      .from(WorkflowSchema)
      .where(eq(WorkflowSchema.userId, userId))
      .orderBy(desc(WorkflowSchema.createdAt));
    return rows as WorkflowDB[];
  },
  async save(workflow) {
    const prev = workflow.id
      ? await pgDb
          .select({ id: WorkflowSchema.id })
          .from(WorkflowSchema)
          .where(eq(WorkflowSchema.id, workflow.id))
      : null;
    const isNew = !prev;
    const [row] = await pgDb
      .insert(WorkflowSchema)
      .values(workflow)
      .onConflictDoUpdate({
        target: [WorkflowSchema.id],
        set: {
          ...workflow,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (isNew) {
      const startNode = generateUINode(NodeKind.Start);
      await pgDb.insert(WorkflowNodeSchema).values({
        kind: NodeKind.Start,
        name: "START",
        workflowId: row.id,
        nodeConfig: {
          outputSchema: startNode.data.outputSchema,
        },
        uiConfig: {
          position: startNode.position,
          type: "default",
        },
      });
    }

    return row as WorkflowDB;
  },
  async saveStructure({ workflowId, nodes, edges }) {
    await pgDb.transaction(async (tx) => {
      if (nodes?.length) {
        await tx
          .insert(WorkflowNodeSchema)
          .values(nodes.map((node) => convertToDB(workflowId, node)))
          .onConflictDoUpdate({
            target: [WorkflowNodeSchema.id],
            set: {
              nodeConfig: sql.raw(
                `excluded.${WorkflowNodeSchema.nodeConfig.name}`,
              ),
              uiConfig: sql.raw(`excluded.${WorkflowNodeSchema.uiConfig.name}`),
              name: sql.raw(`excluded.${WorkflowNodeSchema.name.name}`),
              description: sql.raw(
                `excluded.${WorkflowNodeSchema.description.name}`,
              ),
              kind: sql.raw(`excluded.${WorkflowNodeSchema.kind.name}`),
              updatedAt: new Date(),
            },
          });
      }
      if (edges?.length) {
        const dbEdges = edges.map(
          (edge) =>
            ({
              workflowId,
              id: edge.id,
              source: edge.source,
              target: edge.target,
            }) as WorkflowEdgeDB,
        );
        await tx
          .insert(WorkflowEdgeSchema)
          .values(dbEdges)
          .onConflictDoNothing();
      }
    });
  },
  async deleteStructure({ workflowId, nodeIds, edgeIds }) {
    await pgDb.transaction(async (tx) => {
      if (nodeIds?.length) {
        await tx
          .delete(WorkflowNodeSchema)
          .where(
            and(
              eq(WorkflowNodeSchema.workflowId, workflowId),
              inArray(WorkflowNodeSchema.id, nodeIds),
            ),
          );
      }
      if (edgeIds?.length) {
        await tx
          .delete(WorkflowEdgeSchema)
          .where(
            and(
              eq(WorkflowEdgeSchema.workflowId, workflowId),
              inArray(WorkflowEdgeSchema.id, edgeIds),
            ),
          );
      }
    });
  },
  async selectStructureById(id) {
    const [workflow] = await pgDb
      .select()
      .from(WorkflowSchema)
      .where(eq(WorkflowSchema.id, id));

    if (!workflow) return null;
    const nodes = await pgDb
      .select()
      .from(WorkflowNodeSchema)
      .where(eq(WorkflowNodeSchema.workflowId, id));
    const edges = await pgDb
      .select()
      .from(WorkflowEdgeSchema)
      .where(eq(WorkflowEdgeSchema.workflowId, id));
    return {
      ...(workflow as WorkflowDB),
      nodes: nodes.map(convertToUI),
      edges: edges.map((edge) => {
        const uiEdge: Edge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
        };
        return uiEdge;
      }),
    };
  },
};

function convertToDB(
  workflowId: string,
  node: UINode,
): Omit<typeof WorkflowNodeSchema.$inferInsert, "createdAt" | "updatedAt"> {
  return {
    id: node.id,
    workflowId,
    kind: node.data.kind,
    name: node.data.name,
    description: node.data.description || "",
    nodeConfig: exclude(node.data, ["id", "name", "description"]),
    uiConfig: {
      position: node.position,
    },
  };
}

function convertToUI(node: typeof WorkflowNodeSchema.$inferSelect): UINode {
  const uiNode: UINode = {
    id: node.id,
    ...(node.uiConfig as any),
    data: {
      ...(node.nodeConfig as any),
      id: node.id,
      name: node.name,
      description: node.description || "",
      kind: node.kind as any,
    },
  };
  return uiNode;
}
