import { Node } from "@xyflow/react";
import { ChatModel } from "app-types/chat";
import { ObjectJsonSchema7, TipTapMentionJsonContent } from "app-types/util";
import { ConditionBranches } from "./condition";
import { JSONSchema7 } from "json-schema";

export enum NodeKind {
  Input = "input",
  Output = "output",
  LLM = "llm",
  Tool = "tool",
  Note = "note",
  Code = "code",
  Http = "http",
  Condition = "condition",
}

export type BaseWorkflowNodeDataData<
  T extends {
    kind: NodeKind;
  },
> = {
  id: string;
  name: string; // unique name
  description?: string;
  outputSchema: ObjectJsonSchema7;
} & T;

export type OutputSchemaSourceKey = {
  nodeId: string;
  path: string[];
};

type MCPTool = {
  type: "mcp-tool";
  serverId: string;
  serverName: string;
};

export type WorkflowToolKey = {
  id: string; // tool Name
  description: string;
  parameterSchema?: JSONSchema7;
  returnSchema?: JSONSchema7;
} & MCPTool;

export type InputNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.Input;
}>;

export type OutputNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.Output;
}> & {
  outputData: {
    key: string;
    source?: OutputSchemaSourceKey;
  }[];
};

export type NoteNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.Note;
}>;

export type ToolNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.Tool;
  tool?: WorkflowToolKey;
  model: ChatModel;
  message?: TipTapMentionJsonContent;
}>;

export type LLMNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.LLM;
}> & {
  model: ChatModel;
  messages: {
    role: "user" | "assistant" | "system";
    content?: TipTapMentionJsonContent;
  }[];
};

export type ConditionNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.Condition;
}> & {
  branches: ConditionBranches; // if-elseIf-else structure
};

export type WorkflowNodeData =
  | InputNodeData
  | OutputNodeData
  | LLMNodeData
  | NoteNodeData
  | ToolNodeData
  | ConditionNodeData;

export type NodeRuntimeField = {
  isNew?: boolean;
  status?: "fail" | "running" | "success";
};

export type UINode<Kind extends NodeKind = NodeKind> = Node<
  Extract<WorkflowNodeData, { kind: Kind }> & { runtime?: NodeRuntimeField }
>;
