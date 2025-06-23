import { DBWorkflow } from "app-types/workflow";
import { generateUUID } from "lib/utils";
import { create } from "zustand";

export interface WorkflowState {
  workflow?: DBWorkflow;
  processIds: string[];
  //   status: "ready" | "running" | "paused" |"error"|"success";
}

export interface WorkflowDispatch {
  init: (workflow?: DBWorkflow) => void;
  addProcess: () => () => void;
}

const initialState: WorkflowState = {
  processIds: [],
};

export const useWorkflowStore = create<WorkflowState & WorkflowDispatch>(
  (set) => ({
    ...initialState,
    init: (workflow) => set({ workflow }),
    addProcess: () => {
      const processId = generateUUID();
      set((state) => ({
        processIds: [...state.processIds, processId],
      }));
      return () => {
        set((state) => ({
          processIds: state.processIds.filter((id) => id !== processId),
        }));
      };
    },
  }),
);
