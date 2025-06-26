import { generateUUID } from "lib/utils";
import { NodeKind, UINode } from "./workflow.interface";
import { defaultObjectJsonSchema } from "./shared.workflow";

export function createUINode(
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
      outputSchema: structuredClone(defaultObjectJsonSchema),
      runtime: {
        isNew: true,
      },
    },
    type: "default",
  };

  if (node.data.kind === NodeKind.Output) {
    node.data.outputData = [];
  } else if (node.data.kind === NodeKind.LLM) {
    node.data.outputSchema.properties = {
      answer: {
        type: "string",
      },
      totalTokens: {
        type: "number",
      },
    };
    node.data.messages = [
      {
        role: "user",
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
  } else if (node.data.kind === NodeKind.Tool) {
    node.data.outputSchema.properties = {
      tool_result: {
        type: "object",
      },
    };
  }

  return node;
}
