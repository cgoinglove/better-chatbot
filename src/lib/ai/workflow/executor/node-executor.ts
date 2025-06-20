import { customModelProvider } from "lib/ai/models";
import {
  EndNode,
  LLMNode,
  OutputSchemaSourceKey,
  StartNode,
  WorkflowNode,
} from "../interface";
import { WorkflowRuntimeState } from "./workflow-store";
import { generateText, Message } from "ai";

export type NodeExecutor<T extends WorkflowNode = any> = (input: {
  node: T;
  state: WorkflowRuntimeState;
}) => any; // Node Output

export const startNodeExecutor: NodeExecutor<StartNode> = ({ state }) => {
  return state.input;
};

export const endNodeExecutor: NodeExecutor<EndNode> = ({ node, state }) => {
  return node.outputData.reduce((acc, cur) => {
    acc[cur.key] = state.getOutput(cur.source!);
    return acc;
  }, {} as object);
};

export const llmNodeExecutor: NodeExecutor<LLMNode> = ({ node, state }) => {
  const model = customModelProvider.getModel(node.model);
  const messages: Omit<Message, "id">[] = node.messages.map((message) => {
    const text =
      message.content?.content?.[0].content
        .reduce((prev, part) => {
          let data = "";

          switch (part.type) {
            case "text":
              {
                data += ` ${part.text}`;
              }
              break;
            case "mention":
              {
                const key = JSON.parse(
                  part.attrs.label,
                ) as OutputSchemaSourceKey;
                const mentionItem = state.getOutput(key) || "";
                if (typeof mentionItem == "object") {
                  data +=
                    "\n```json\n" +
                    JSON.stringify(mentionItem, null, 2) +
                    "\n```\n";
                } else data += ` \`${String(mentionItem)}\``;
              }
              break;
          }
          return prev + data;
        }, "")
        .trim() || "";

    return {
      role: message.role,
      content: "",
      parts: [
        {
          type: "text",
          text,
        },
      ],
    };
  });
  return generateText({
    model,
    messages,
  }).then((res) => res.text);
};
