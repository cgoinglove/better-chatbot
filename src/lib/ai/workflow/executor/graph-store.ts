import { objectFlow } from "lib/utils";
import { OutputSchemaSourceKey } from "../workflow.interface";
import { graphStore } from "ts-edge";
import { DBEdge, DBNode } from "app-types/workflow";

export interface WorkflowRuntimeState {
  query: Record<string, unknown>;
  inputs: {
    [nodeId: string]: any;
  };
  nodes: DBNode[];
  edges: DBEdge[];
  outputs: {
    [nodeId: string]: any;
  };
  setInput(nodeId: string, value: any): void;
  getInput(nodeId: string): any;
  setOutput(key: OutputSchemaSourceKey, value: any): void;
  getOutput<T>(key: OutputSchemaSourceKey): undefined | T;
}

export const createGraphStore = (params: {
  nodes: DBNode[];
  edges: DBEdge[];
}) => {
  return graphStore<WorkflowRuntimeState>((set, get) => {
    return {
      query: {},
      outputs: {},
      inputs: {},
      nodes: params.nodes,
      edges: params.edges,
      setInput(nodeId, value) {
        set((prev) => {
          return { inputs: { ...prev.inputs, [nodeId]: value } };
        });
      },
      getInput(nodeId) {
        const { inputs } = get();
        return inputs[nodeId];
      },
      setOutput(key, value) {
        set((prev) => {
          const next = objectFlow(prev.outputs).setByPath(
            [key.nodeId, ...key.path],
            value,
          );
          return {
            outputs: next,
          };
        });
      },
      getOutput(key) {
        const { outputs } = get();
        return objectFlow(outputs[key.nodeId]).getByPath(key.path);
      },
    };
  });
};
