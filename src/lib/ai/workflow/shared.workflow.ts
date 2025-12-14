import {
  ObjectJsonSchema7,
  TipTapMentionJsonContent,
  TipTapMentionJsonContentPart,
} from "app-types/util";
import { JSONSchema7 } from "json-schema";
import {
  UINode,
  OutputSchemaSourceKey,
  WorkflowNodeData,
} from "./workflow.interface";
import { exclude, isString } from "lib/utils";
import { DBEdge, DBNode } from "app-types/workflow";
import { Edge } from "@xyflow/react";
import { GraphEvent } from "ts-edge";
import { UIMessage } from "ai";

export const defaultObjectJsonSchema: ObjectJsonSchema7 = {
  type: "object",
  properties: {},
};

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
}): {
  nodeName: string;
  path: string[];
  notFound?: boolean;
  type?: string;
} {
  const accessibleNodes = findAccessibleNodeIds({
    nodeId,
    nodes,
    edges,
  });
  const data = {
    nodeName: "ERROR",
    path: source.path,
    notFound: true,
    type: undefined as undefined | string,
  };
  if (!accessibleNodes.includes(source.nodeId)) return data;

  const sourceNode = nodes.find((node) => node.id === source.nodeId)!;
  if (!sourceNode) return data;
  data.nodeName = sourceNode.name;
  const schema = findJsonSchemaByPath(sourceNode.outputSchema, source.path);
  if (!schema) return data;
  data.notFound = false;
  data.type = isString(schema) ? schema : (schema?.type as string);

  return data;
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

export function convertTiptapJsonToText({
  json,
  mentionParser,
  getOutput,
}: {
  json: TipTapMentionJsonContent;
  mentionParser?: (
    part: Extract<TipTapMentionJsonContentPart, { type: "mention" }>,
  ) => string;
  getOutput: (key: OutputSchemaSourceKey) => any;
}): string {
  const parser =
    mentionParser ||
    ((part) => {
      const key = JSON.parse(part.attrs.label) as OutputSchemaSourceKey;
      const mentionItem = getOutput(key) || "";
      const value =
        typeof mentionItem == "object"
          ? JSON.stringify(mentionItem)
          : String(mentionItem);
      return value;
    });
  // 递归处理 TipTap JSON 内容
  const processContent = (content: any[]): string => {
    return content
      .flatMap((item) => {
        if (!item) return "";

        // 处理段落
        if (item.type === "paragraph") {
          if (!item.content) return "";
          return processContent(item.content);
        }

        // 处理文本
        if (item.type === "text") {
          return item.text || "";
        }

        // 处理提及
        if (item.type === "mention") {
          return parser(item);
        }

        // 处理硬换行
        if (item.type === "hardBreak") {
          return "\n\n";
        }

        // 处理项目符号列表
        if (item.type === "bulletList") {
          if (!item.content) return "";
          return (
            item.content
              .map((listItem: any) => {
                const itemContent = processContent(listItem.content || []);
                return `• ${itemContent.trim()}`;
              })
              .join("\n") + "\n"
          );
        }

        // 处理列表项
        if (item.type === "listItem") {
          if (!item.content) return "";
          return processContent(item.content);
        }

        // 递归处理其他有 content 的元素
        if (item.content) {
          return processContent(item.content);
        }

        return "";
      })
      .join("")
      .trim();
  };

  return processContent(json.content || []) || "";
}

export function convertTiptapJsonToAiMessage({
  role,
  getOutput,
  json,
}: {
  role: "user" | "assistant" | "system";
  getOutput: (key: OutputSchemaSourceKey) => any;
  json?: TipTapMentionJsonContent;
}): Omit<UIMessage, "id"> {
  if (!json)
    return {
      role,
      parts: [],
    };

  const text = convertTiptapJsonToText({
    json,
    getOutput,
    mentionParser: (part) => {
      const key = JSON.parse(part.attrs.label) as OutputSchemaSourceKey;
      const mentionItem = getOutput(key) || "";
      const value =
        typeof mentionItem == "object"
          ? "\n```json\n" + JSON.stringify(mentionItem, null, 2) + "\n```\n"
          : mentionItem
            ? String(mentionItem)
            : "";
      return value;
    },
  });

  return {
    role,
    parts: [
      {
        type: "text",
        text,
      },
    ],
  };
}
