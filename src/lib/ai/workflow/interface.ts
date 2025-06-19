import { Node } from "@xyflow/react";
import { ChatModel } from "app-types/chat";
import { ObjectJsonSchema7, TipTapMentionJsonContent } from "app-types/util";

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

export type BaseWorkflowNode<
  T extends {
    kind: NodeKind;
  },
> = {
  id: string;
  name: string; // unique name
  description?: string;
  outputSchema: ObjectJsonSchema7;
} & T;

export type OutputSchemaSource = {
  nodeId: string;
  path: string[];
};

export type StartNode = BaseWorkflowNode<{
  kind: NodeKind.Start;
}>;

export type EndNode = BaseWorkflowNode<{
  kind: NodeKind.End;
}> & {
  outputData: {
    key: string;
    source?: OutputSchemaSource;
  }[];
};

export type InformationNode = BaseWorkflowNode<{
  kind: NodeKind.Information;
}>;

export type LLMNode = BaseWorkflowNode<{
  kind: NodeKind.LLM;
}> & {
  model: ChatModel;
  messages: {
    role: "user" | "assistant" | "system";
    content?: TipTapMentionJsonContent;
  }[];
};

export type WorkflowNode = StartNode | EndNode | LLMNode | InformationNode;

export type NodeRuntimeField = {
  status?: "running" | "success" | "fail" | "idle";
  isNew?: boolean;
  result?: any;
  isRunTab?: boolean;
};

export type UINode<Kind extends NodeKind = NodeKind> = Node<
  Extract<WorkflowNode, { kind: Kind }> & { runtime?: NodeRuntimeField }
>;
