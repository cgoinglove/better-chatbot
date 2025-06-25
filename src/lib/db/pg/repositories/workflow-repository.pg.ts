import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { pgDb } from "../db.pg";
import {
  WorkflowEdgeSchema,
  WorkflowNodeDataSchema,
  WorkflowSchema,
} from "../schema.pg";
import {
  DBWorkflow,
  DBEdge,
  DBNode,
  WorkflowRepository,
} from "app-types/workflow";
import { NodeKind } from "lib/ai/workflow/workflow.interface";
import {
  convertUINodeToDBNode,
  generateUINode,
} from "lib/ai/workflow/shared.workflow";

export const pgWorkflowRepository: WorkflowRepository = {
  async selectById(id) {
    const [workflow] = await pgDb
      .select()
      .from(WorkflowSchema)
      .where(eq(WorkflowSchema.id, id));
    return workflow as DBWorkflow;
  },
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
    return rows as DBWorkflow[];
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
      const startNode = generateUINode(NodeKind.Input);
      await pgDb.insert(WorkflowNodeDataSchema).values({
        ...convertUINodeToDBNode(row.id, startNode),
        name: "INPUT",
      });
    }

    return row as DBWorkflow;
  },
  async saveStructure({ workflowId, nodes, edges, deleteNodes, deleteEdges }) {
    await pgDb.transaction(async (tx) => {
      const deletePromises: Promise<any>[] = [];
      if (deleteNodes?.length) {
        const deleteNodePromises = tx
          .delete(WorkflowNodeDataSchema)
          .where(
            and(
              eq(WorkflowNodeDataSchema.workflowId, workflowId),
              inArray(WorkflowNodeDataSchema.id, deleteNodes),
            ),
          );
        deletePromises.push(deleteNodePromises);
      }
      if (deleteEdges?.length) {
        const deleteEdgePromises = tx
          .delete(WorkflowEdgeSchema)
          .where(
            and(
              eq(WorkflowEdgeSchema.workflowId, workflowId),
              inArray(WorkflowEdgeSchema.id, deleteEdges),
            ),
          );
        deletePromises.push(deleteEdgePromises);
      }
      await Promise.all(deletePromises);
      if (nodes?.length) {
        await tx
          .insert(WorkflowNodeDataSchema)
          .values(nodes)
          .onConflictDoUpdate({
            target: [WorkflowNodeDataSchema.id],
            set: {
              nodeConfig: sql.raw(
                `excluded.${WorkflowNodeDataSchema.nodeConfig.name}`,
              ),
              uiConfig: sql.raw(
                `excluded.${WorkflowNodeDataSchema.uiConfig.name}`,
              ),
              name: sql.raw(`excluded.${WorkflowNodeDataSchema.name.name}`),
              description: sql.raw(
                `excluded.${WorkflowNodeDataSchema.description.name}`,
              ),
              kind: sql.raw(`excluded.${WorkflowNodeDataSchema.kind.name}`),
              updatedAt: new Date(),
            },
          });
      }
      if (edges?.length) {
        await tx.insert(WorkflowEdgeSchema).values(edges).onConflictDoNothing();
      }
    });
  },
  async selectStructureById(id) {
    const [workflow] = await pgDb
      .select()
      .from(WorkflowSchema)
      .where(eq(WorkflowSchema.id, id));

    if (!workflow) return null;
    const nodePromises = pgDb
      .select()
      .from(WorkflowNodeDataSchema)
      .where(eq(WorkflowNodeDataSchema.workflowId, id));
    const edgePromises = pgDb
      .select()
      .from(WorkflowEdgeSchema)
      .where(eq(WorkflowEdgeSchema.workflowId, id));
    const [nodes, edges] = await Promise.all([nodePromises, edgePromises]);
    return {
      ...(workflow as DBWorkflow),
      nodes: nodes as DBNode[],
      edges: edges as DBEdge[],
    };
  },
};
