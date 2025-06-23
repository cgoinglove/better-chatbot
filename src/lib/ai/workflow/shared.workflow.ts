import { ObjectJsonSchema7 } from "app-types/util";
import { JSONSchema7 } from "json-schema";
import {
  NodeKind,
  UINode,
  OutputSchemaSourceKey,
  WorkflowNodeData,
} from "./workflow.interface";
import { exclude, generateUUID } from "lib/utils";
import { DBEdge, DBNode } from "app-types/workflow";
import { Edge } from "@xyflow/react";
import { GraphEvent } from "ts-edge";

export const defaultObjectJsonSchema: ObjectJsonSchema7 = {
  type: "object",
  properties: {},
};

export function generateUINode(
  kind: NodeKind,
  option?: Partial<{
    position: { x: number; y: number };
    name?: string;
    id?: string;
  }>,
): UINode {
  const id = option?.id ?? generateUUID();

  const node: UINode = {
    ...option,
    id,
    position: option?.position ?? { x: 0, y: 0 },
    data: {
      kind: kind as any,
      name: option?.name ?? kind.toUpperCase(),
      id,
      outputSchema: { ...defaultObjectJsonSchema },
      runtime: {
        isNew: true,
      },
    },
    type: "default",
  };

  if (node.data.kind === NodeKind.End) {
    node.data.outputData = [];
  } else if (node.data.kind === NodeKind.LLM) {
    node.data.outputSchema.properties = {
      chat_response: {
        type: "string",
      },
    };
    node.data.messages = [
      {
        role: "system",
      },
    ];
  } else if (node.data.kind === NodeKind.Condition) {
    node.data.branches = {
      if: {
        id: "if",
        logicalOperator: "AND",
        type: "if",
        conditions: [],
      },
      else: {
        id: "else",
        logicalOperator: "AND",
        type: "else",
        conditions: [],
      },
    };
  }

  return node;
}

export function findAccessibleNodeIds({
  nodeId,
  nodes,
  edges,
}: {
  nodeId: string;
  nodes: WorkflowNodeData[];
  edges: { target: string; source: string }[];
}): string[] {
  const accessibleNodes: string[] = [];
  const allNodeIds = nodes.map((node) => node.id);
  let currentNodes = [nodeId];
  while (currentNodes.length > 0) {
    const targets = [...currentNodes];
    currentNodes = [];
    for (const target of targets) {
      const sources = edges
        .filter(
          (edge) => edge.target === target && allNodeIds.includes(edge.source),
        )
        .map((edge) => edge.source);
      accessibleNodes.push(...sources);
      currentNodes.push(...sources);
    }
  }
  return accessibleNodes;
}

export function findJsonSchemaByPath(
  schema: ObjectJsonSchema7,
  path: string[],
): JSONSchema7 | undefined {
  const [key, ...rest] = path;
  if (rest.length === 0) {
    return schema.properties?.[key] as JSONSchema7;
  }
  return findJsonSchemaByPath(
    schema.properties![key] as ObjectJsonSchema7,
    rest,
  );
}
export function findAvailableSchemaBySource({
  nodeId,
  source,
  nodes,
  edges,
}: {
  nodeId: string;
  source: OutputSchemaSourceKey;
  nodes: WorkflowNodeData[];
  edges: { target: string; source: string }[];
}): JSONSchema7 | undefined {
  const accessibleNodes = findAccessibleNodeIds({
    nodeId,
    nodes,
    edges,
  });
  if (!accessibleNodes.includes(source.nodeId)) return;
  const sourceNode = nodes.find((node) => node.id === source.nodeId)!;
  return findJsonSchemaByPath(sourceNode.outputSchema, source.path);
}

export function convertUINodeToDBNode(
  workflowId: string,
  node: UINode,
): Omit<DBNode, "createdAt" | "updatedAt"> {
  return {
    id: node.id,
    workflowId,
    kind: node.data.kind,
    name: node.data.name,
    description: node.data.description || "",
    nodeConfig: exclude(node.data, ["id", "name", "description", "runtime"]),
    uiConfig: {
      position: node.position,
      type: node.type || "default",
    },
  };
}

export function convertDBNodeToUINode(node: DBNode): UINode {
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
    type: node.uiConfig.type || "default",
  };
  return uiNode;
}

export function convertUIEdgeToDBEdge(
  workflowId: string,
  edge: Edge,
): Omit<DBEdge, "createdAt" | "updatedAt"> {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    uiConfig: {
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      label: edge.label ?? undefined,
    },
    workflowId,
  };
}

export function convertDBEdgeToUIEdge(edge: DBEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...edge.uiConfig,
  };
}

// Workflow Stream Processing Functions
export const WORKFLOW_STREAM_DELIMITER = "\n";
export const WORKFLOW_STREAM_PREFIX = "WF_EVENT:";

export function encodeWorkflowEvent(event: GraphEvent): string {
  const eventData = {
    timestamp: Date.now(),
    ...event,
  };
  return `${WORKFLOW_STREAM_PREFIX}${JSON.stringify(eventData)}${WORKFLOW_STREAM_DELIMITER}`;
}

export function decodeWorkflowEvents(buffer: string): {
  events: GraphEvent[];
  remainingBuffer: string;
} {
  const lines = buffer.split(WORKFLOW_STREAM_DELIMITER);
  const remainingBuffer = lines.pop() || "";
  const events: GraphEvent[] = [];

  for (const line of lines) {
    if (line.startsWith(WORKFLOW_STREAM_PREFIX)) {
      try {
        const eventJson = line.slice(WORKFLOW_STREAM_PREFIX.length);
        const event = JSON.parse(eventJson);
        events.push(event);
      } catch (error) {
        console.error("Failed to parse workflow event:", line, error);
      }
    }
  }

  return { events, remainingBuffer };
}
