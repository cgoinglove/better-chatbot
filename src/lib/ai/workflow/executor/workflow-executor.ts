import { Edge } from "@xyflow/react";
import { NodeKind, WorkflowNode } from "../interface";
import { createWorkflowStore } from "./workflow-store";
import { createStateGraph } from "ts-edge";
import {
  endNodeExecutor,
  llmNodeExecutor,
  NodeExecutor,
  startNodeExecutor,
} from "./node-executor";
import { toAny } from "lib/utils";

function getExecutorByKind(kind: NodeKind): NodeExecutor {
  switch (kind) {
    case NodeKind.Start:
      return startNodeExecutor;
    case NodeKind.End:
      return endNodeExecutor;
    case NodeKind.LLM:
      return llmNodeExecutor;
  }
  return () => {
    throw new Error(`Undefined '${kind}' Node Executor`);
  };
}

export const createWorkflowExecutor = (workflow: {
  id: string;
  nodes: WorkflowNode[];
  edges: Edge[];
}) => {
  const store = createWorkflowStore(workflow.id);

  const graph = createStateGraph(store);

  workflow.nodes.forEach((node) => {
    graph.addNode({
      name: node.id,
      metadata: {
        kind: node.kind,
      },
      async execute(state) {
        const executor = getExecutorByKind(node.kind);
        const output = await executor({
          node,
          state,
        });

        if (output) {
          state.setOutput(
            {
              nodeId: node.id,
              path: [],
            },
            output,
          );
        }
      },
    });

    const targetEdges = workflow.edges.filter((edge) => edge.target == node.id);

    if (targetEdges.length) toAny(graph.edge)(node.id, targetEdges);
  });
};
