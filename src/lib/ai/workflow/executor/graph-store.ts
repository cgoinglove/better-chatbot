import { objectFlow } from "lib/utils";
import { OutputSchemaSourceKey } from "../workflow.interface";
import { graphStore } from "ts-edge";

export interface WorkflowRuntimeState {
  input: Record<string, unknown>;
  outputs: {
    [nodeId: string]: any;
  };
  setOutput(key: OutputSchemaSourceKey, value: any): void;
  getOutput<T>(key: OutputSchemaSourceKey): undefined | T;
}

export const createGraphStore = () => {
  return graphStore<WorkflowRuntimeState>((set, get) => {
    return {
      input: {},
      outputs: {},
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
