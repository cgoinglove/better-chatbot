import { appStore } from "@/app/store";
import { ObjectJsonSchema7 } from "app-types/util";
import { JSONSchema7 } from "json-schema";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { generateUUID } from "lib/utils";

export const defaultJsonSchema: ObjectJsonSchema7 = {
  type: "object",
  properties: {},
};

export function generateInitialNode(
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
      name: option?.name ?? kind,
      id,
      outputSchema: { ...defaultJsonSchema },
      stored: false,
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

export function findOutputSchemaSource(
  schema: ObjectJsonSchema7,
  path: string[],
): JSONSchema7 | undefined {
  const [key, ...rest] = path;
  if (rest.length === 0) {
    return schema.properties?.[key] as JSONSchema7;
  }
  return findOutputSchemaSource(
    schema.properties![key] as ObjectJsonSchema7,
    rest,
  );
}
