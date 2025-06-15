import { appStore } from "@/app/store";
import { ObjectJsonSchema7 } from "app-types/util";
import { JSONSchema7 } from "json-schema";
import {
  LLMNode,
  NodeKind,
  UINode,
  WorkflowNode,
} from "lib/ai/workflow/interface";
import { generateUUID } from "lib/utils";

export const defaultJsonSchema: ObjectJsonSchema7 = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The name of the node",
    },
    description: {
      type: "string",
    },
    test: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the test",
        },
        description: {
          type: "string",
        },
        ooo: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
          },
        },
      },
    },
  },
};

export function generateInitialNode(
  kind: NodeKind,
  option?: DeepPartial<UINode>,
): UINode {
  const originId = option?.id ?? option?.data?.id;
  const id = originId ?? generateUUID();

  const outputSchema = [NodeKind.End, NodeKind.Information].includes(kind)
    ? (option?.data?.outputSchema ?? {})
    : {
        ...defaultJsonSchema,
        ...option?.data?.outputSchema,
      };

  const node: UINode = {
    ...option,
    id,
    position: { x: option?.position?.x ?? 0, y: option?.position?.y ?? 0 },
    data: {
      ...option?.data,
      kind: kind as any,
      name: option?.data?.name ?? kind,
      id,
      outputSchema: outputSchema as ObjectJsonSchema7,
      stored: !!originId,
    },
    type: "default",
  };

  if (node.data.kind === NodeKind.End) {
    node.data.outputData = [...(node.data.outputData ?? [])];
  } else if (node.data.kind === NodeKind.LLM) {
    node.data.model = node.data.model ?? appStore.getState().chatModel;
    node.data.messages = [
      {
        role: "system",
        content: {
          type: "text",
          text: "",
        },
      },
    ];
  }

  return node;
}

export function addUsageField(
  node: WorkflowNode,
  item: { nodeId: string; path: string[] },
): WorkflowNode {
  const items: string[] = [
    ...(node.usageFields?.[item.nodeId] ?? []),
    item.path,
  ].map((v) => JSON.stringify(v));

  const dedupedItems = Array.from(new Set(items)).map((v) => JSON.parse(v));

  return {
    ...node,
    usageFields: {
      ...node.usageFields,
      [item.nodeId]: dedupedItems,
    },
  };
}

export function findSchemaByPath(
  schema: ObjectJsonSchema7 | JSONSchema7,
  path: string[],
): JSONSchema7 | undefined {
  const [key, ...rest] = path;
  if (rest.length === 0) {
    return schema.properties?.[key] as JSONSchema7;
  }
  return findSchemaByPath(schema.properties![key] as JSONSchema7, rest);
}
