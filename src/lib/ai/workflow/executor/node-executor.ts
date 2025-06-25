import { customModelProvider } from "lib/ai/models";
import {
  ConditionNodeData,
  OutputNodeData,
  LLMNodeData,
  InputNodeData,
  WorkflowNodeData,
  ToolNodeData,
} from "../workflow.interface";
import { WorkflowRuntimeState } from "./graph-store";
import { generateText, Message } from "ai";
import { checkConditionBranch } from "../condition";
import { convertTiptapJsonToAiMessage } from "../shared.workflow";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { callMcpToolAction } from "@/app/api/mcp/actions";
import { toAny } from "lib/utils";

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
export const inputNodeExecutor: NodeExecutor<InputNodeData> = ({ state }) => {
  return {
    output: state.query,
  };
};

export const outputNodeExecutor: NodeExecutor<OutputNodeData> = ({
  node,
  state,
}) => {
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
  const messages: Omit<Message, "id">[] = node.messages.map((message) =>
    convertTiptapJsonToAiMessage({
      role: message.role,
      getOutput: state.getOutput,
      json: message.content,
    }),
  );

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

export const toolNodeExecutor: NodeExecutor<ToolNodeData> = async ({
  node,
  state,
}) => {
  const result: {
    input: any;
    output: any;
  } = {
    input: undefined,
    output: undefined,
  };

  if (!node.tool) throw new Error("Tool not found");

  if (!node.tool?.parameterSchema) {
    result.input = {
      parameter: undefined,
    };
  } else {
    const prompt: string | undefined = node.message
      ? toAny(
          convertTiptapJsonToAiMessage({
            role: "user",
            getOutput: state.getOutput,
            json: node.message,
          }),
        ).parts[0]?.text
      : undefined;
    const response = await generateText({
      model: customModelProvider.getModel(node.model),
      maxSteps: 1,
      toolChoice: "required",
      prompt,
      tools: {
        [node.tool.id]: {
          description: node.tool.description,
          parameters: jsonSchemaToZod(node.tool.parameterSchema),
        },
      },
    });

    result.input = {
      parameter: response.toolCalls.find((call) => call.args)?.args,
      prompt,
    };
  }

  if (node.tool.type == "mcp-tool") {
    result.output = {
      tool_result: await callMcpToolAction(
        node.tool.serverId,
        node.tool.id,
        result.input.parameter,
      ),
    };
  } else {
    result.output = {
      tool_result: {
        error: `Not implemented "${node.tool.type}"`,
      },
    };
  }

  return result;
};
