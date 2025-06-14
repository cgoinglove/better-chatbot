import { Node } from "@xyflow/react";
import { UIMessage } from "ai";
import { ChatModel } from "app-types/chat";
import { ObjectJsonSchema7 } from "app-types/util";
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

export type UINode<T extends BaseWorkflowNode<any> = WorkflowNode> = Node<
  T & {
    status?: "running" | "success" | "fail" | "idle";
    stored?: boolean;
    result?: any;
    isRunTab?: boolean;
  }
>;

export type BaseWorkflowNode<Kind extends NodeKind> = {
  id: string;
  kind: Kind;
  name: string; // unique name
  description?: string;
  outputSchema: ObjectJsonSchema7;
  usageFields?: {
    [nodeId: string]: string[][]; // path [['title'],['session','id']]
  };
};

export type StartNode = BaseWorkflowNode<NodeKind.Start>;

export type EndNode = BaseWorkflowNode<NodeKind.End>;

export type InformationNode = BaseWorkflowNode<NodeKind.Information>;

export type LLMNode = BaseWorkflowNode<NodeKind.LLM> & {
  model: ChatModel;
  messages: {
    role: "user" | "assistant" | "system";
    parts: Extract<UIMessage["parts"][number], { type: "text" }>[]; // todo other types
  };
};

export type WorkflowNode = StartNode | EndNode | LLMNode | InformationNode;
