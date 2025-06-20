import { objectFlow } from "lib/utils";
import { OutputSchemaSourceKey } from "../interface";
import { graphStore } from "ts-edge";

export interface WorkflowRuntimeState {
  id: string; // workflow id
  input: Record<string, unknown>;
  outputs: {
    [nodeId: string]: Record<string, unknown>;
  };
  setOutput(key: OutputSchemaSourceKey, value: any): void;
  getOutput<T>(key: OutputSchemaSourceKey): undefined | T;
}

export const createWorkflowStore = (workflowId: string) => {
  return graphStore<WorkflowRuntimeState>((set, get) => {
    return {
      id: workflowId,
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
