export type NodeType =
  | "start"
  | "end"
  | "condition"
  | "llm"
  | "tool"
  | "code"
  | "http";

export type NodeMetadata = {
  position: {
    x: number;
    y: number;
  };
  [key: string]: any;
};

export type BaseNode = {
  id: string;
  name: string;
  description: string;
  metadata: NodeMetadata;
};

export type StartNode = BaseNode & {
  type: "start";
  input: any;
};

export type EndNode = BaseNode & {
  type: "end";
  output: any;
};
