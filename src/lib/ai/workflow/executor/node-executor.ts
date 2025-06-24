import { customModelProvider } from "lib/ai/models";
import {
  ConditionNodeData,
  EndNodeData,
  LLMNodeData,
  OutputSchemaSourceKey,
  StartNodeData,
  WorkflowNodeData,
} from "../workflow.interface";
import { WorkflowRuntimeState } from "./graph-store";
import { generateText, Message } from "ai";
import { checkConditionBranch } from "../condition";

export type NodeExecutor<T extends WorkflowNodeData = any> = (input: {
  node: T;
  state: WorkflowRuntimeState;
}) =>
  | Promise<{
      input?: any;
      output?: any;
    }>
  | {
      input?: any;
      output?: any;
    };
export const startNodeExecutor: NodeExecutor<StartNodeData> = ({ state }) => {
  return {
    output: state.query,
  };
};

export const endNodeExecutor: NodeExecutor<EndNodeData> = ({ node, state }) => {
  return {
    output: node.outputData.reduce((acc, cur) => {
      acc[cur.key] = state.getOutput(cur.source!);
      return acc;
    }, {} as object),
  };
};

export const llmNodeExecutor: NodeExecutor<LLMNodeData> = async ({
  node,
  state,
}) => {
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

  const response = await generateText({
    model,
    messages,
    maxSteps: 1,
  });
  return {
    input: {
      chatModel: node.model,
      messages,
    },
    output: {
      totalTokens: response.usage.totalTokens,
      answer: response.text,
    },
  };
};

export const conditionNodeExecutor: NodeExecutor<ConditionNodeData> = async ({
  node,
  state,
}) => {
  const okBranch =
    [node.branches.if, ...(node.branches.elseIf || [])].find((branch) => {
      return checkConditionBranch(branch, state.getOutput);
    }) || node.branches.else;

  const nextNodes = state.edges
    .filter((edge) => edge.uiConfig.sourceHandle === okBranch.id)
    .map((edge) => state.nodes.find((node) => node.id === edge.target)!)
    .filter(Boolean);

  return {
    output: {
      type: okBranch.type,
      branch: okBranch.id,
      nextNodes,
    },
  };
};
