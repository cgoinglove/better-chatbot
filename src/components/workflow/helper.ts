import { ObjectJsonSchema7 } from "app-types/util";
import { NodeKind, UINode, WorkflowNode } from "lib/ai/workflow/interface";
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

export function generateInitialNode<T extends NodeKind>(
  kind: T,
  option?: DeepPartial<UINode>,
): UINode {
  const originId = option?.id ?? option?.data?.id;
  const id = originId ?? generateUUID();
  const node: UINode = {
    ...option,
    id,
    position: { x: option?.position?.x ?? 0, y: option?.position?.y ?? 0 },
    data: {
      ...option?.data,
      kind: kind as any,
      name: option?.data?.name ?? kind,
      id,
      outputSchema: {
        ...defaultJsonSchema,
        ...option?.data?.outputSchema,
      } as ObjectJsonSchema7,
      stored: !!originId,
    },
    type: "default",
  };
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
