import { appStore } from "@/app/store";
import { ObjectJsonSchema7 } from "app-types/util";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { generateUUID } from "lib/utils";

export const defaultJsonSchema: ObjectJsonSchema7 = {
  type: "object",
  properties: {},
};

export function generateUINode(
  kind: NodeKind,
  option?: Partial<{
    position: { x: number; y: number };
    name?: string;
  }>,
): UINode {
  const id = generateUUID();

  const node: UINode = {
    ...option,
    id,
    position: option?.position ?? { x: 0, y: 0 },
    data: {
      kind: kind as any,
      name: option?.name ?? kind.toUpperCase(),
      id,
      outputSchema: { ...defaultJsonSchema },
      runtime: {
        isNew: true,
      },
    },
    type: "default",
  };

  if (node.data.kind === NodeKind.End) {
    node.data.outputData = [...(node.data.outputData ?? [])];
  } else if (node.data.kind === NodeKind.LLM) {
    node.data.model = node.data.model ?? appStore.getState().chatModel;
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
  }

  return node;
}
