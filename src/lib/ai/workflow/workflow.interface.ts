import { Node } from "@xyflow/react";
import { ChatModel } from "app-types/chat";
import { ObjectJsonSchema7, TipTapMentionJsonContent } from "app-types/util";
import { ConditionBranches } from "./condition";

export enum NodeKind {
  Start = "start",
  End = "end",
  LLM = "llm",
  Tool = "tool",
  Information = "information",
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

export type StartNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.Start;
}>;

export type EndNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.End;
}> & {
  outputData: {
    key: string;
    source?: OutputSchemaSourceKey;
  }[];
};

export type InformationNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.Information;
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
  | StartNodeData
  | EndNodeData
  | LLMNodeData
  | InformationNodeData
  | ConditionNodeData;

export type NodeRuntimeField = {
  status?: "running" | "success" | "fail" | "idle";
  isNew?: boolean;
  result?: any;
  isRunTab?: boolean;
};

export type UINode<Kind extends NodeKind = NodeKind> = Node<
  Extract<WorkflowNodeData, { kind: Kind }> & { runtime?: NodeRuntimeField }
>;
