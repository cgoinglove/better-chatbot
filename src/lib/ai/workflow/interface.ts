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

export type BaseWorkflowNode<
  T extends {
    kind: NodeKind;
  },
> = {
  id: string;
  name: string; // unique name
  description?: string;
  outputSchema: ObjectJsonSchema7;
  usageFields?: {
    [nodeId: string]: string[][]; // path [['title'],['session','id']]
  };
} & T;

export type StartNode = BaseWorkflowNode<{
  kind: NodeKind.Start;
}>;

export type EndNode = BaseWorkflowNode<{
  kind: NodeKind.End;
}> & {
  outputData: {
    key: string;
    source?: {
      nodeId: string;
      path: string[];
    };
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
    parts: Extract<UIMessage["parts"][number], { type: "text" }>[]; // todo other types
  };
};

export type WorkflowNode = StartNode | EndNode | LLMNode | InformationNode;

export type NodeRuntimeField = {
  status?: "running" | "success" | "fail" | "idle";
  stored?: boolean;
  result?: any;
  isRunTab?: boolean;
};

export type UINode<Kind extends NodeKind = NodeKind> = Node<
  Extract<WorkflowNode, { kind: Kind }> & NodeRuntimeField
>;
