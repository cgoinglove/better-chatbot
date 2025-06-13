import { UIMessage } from "ai";
import { ChatModel } from "app-types/chat";

export type NodeType =
  | "start"
  | "end"
  | "condition"
  | "llm"
  | "tool"
  | "code"
  | "http"
  | "information";

export type NodeMetadata = {
  position: {
    x: number;
    y: number;
  };
  [key: string]: any;
};

export type Edge = {
  id: string;
  workflowId: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type BaseWorkflowNode<Type extends NodeType> = {
  type: Type;
  id: string;
  workflowId: string;
  name: string;
  description: string;
  metadata: NodeMetadata;
  isMergeNode?: boolean;
  usageFields: string[];
  generateFields: Record<
    string,
    "text" | "number" | "boolean" | "date" | "object" | "array"
  >;
};

export type StartNode = BaseWorkflowNode<"start"> & {
  input: any;
};

export type EndNode = BaseWorkflowNode<"end"> & {
  output: any;
};

export type LLMNode = BaseWorkflowNode<"llm"> & {
  model: ChatModel;
  messages: {
    role: "user" | "assistant" | "system";
    parts: Extract<UIMessage["parts"][number], { type: "text" }>[];
  };
  outputSchema: "text" | "json";
};

export type InformationNode = BaseWorkflowNode<"information"> & {
  title: string;
  description?: string;
};

export type WorkflowNode = StartNode | EndNode | LLMNode | InformationNode;

export type WorkflowContext<State extends Record<string, any>> = {
  state: State;
  setState: (
    state: Partial<State> | ((state: State) => Partial<State>),
  ) => void;
};

export type WorkflowConfig = {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: Edge[];
};
