import { UIMessage } from "ai";
import { ChatModel } from "./chat";

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
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type BaseNode<Type extends NodeType> = {
  type: Type;
  id: string;
  name: string;
  description: string;
  metadata: NodeMetadata;
  isMergeNode?: boolean;
  usageFields: string[];
  generateFields: string[];
};

export type StartNode = BaseNode<"start"> & {
  inputSchema: "text"; // todo: json schema
};

export type EndNode = BaseNode<"end"> & {
  output: any;
};

export type LLMNode = BaseNode<"llm"> & {
  model: ChatModel;
  messages: {
    role: "user" | "assistant" | "system";
    parts: Extract<UIMessage["parts"][number], { type: "text" }>[];
  };
  outputSchema: "text"; // todo: json schema
};

export type InformationNode = BaseNode<"information"> & {
  title: string;
  description?: string;
};
