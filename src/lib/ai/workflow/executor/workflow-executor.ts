import { NodeKind } from "../workflow.interface";
import { createWorkflowStore, WorkflowRuntimeState } from "./workflow-store";
import { createStateGraph, graphNode, StateGraphRegistry } from "ts-edge";
import {
  conditionNodeExecutor,
  endNodeExecutor,
  llmNodeExecutor,
  NodeExecutor,
  startNodeExecutor,
} from "./node-executor";
import { toAny } from "lib/utils";
import { addEdgeBranchLabel } from "./add-edge-branch-label";
import { DBEdge, DBNode } from "app-types/workflow";
import { convertDBNodeToUINode } from "../shared.workflow";

function getExecutorByKind(kind: NodeKind): NodeExecutor {
  switch (kind) {
    case NodeKind.Start:
      return startNodeExecutor;
    case NodeKind.End:
      return endNodeExecutor;
    case NodeKind.LLM:
      return llmNodeExecutor;
    case NodeKind.Condition:
      return conditionNodeExecutor;
    case "NOOP" as any:
      return () => {};
  }
  return () => {
    console.warn(`Undefined '${kind}' Node Executor`);
    return {};
  };
}

export const createWorkflowExecutor = (workflow: {
  nodes: DBNode[];
  edges: DBEdge[];
}) => {
  const store = createWorkflowStore();

  const graph = createStateGraph(store) as StateGraphRegistry<
    WorkflowRuntimeState,
    string
  >;
  addEdgeBranchLabel(workflow.nodes, workflow.edges);

  const skipNode = graphNode({
    /*  Identification  */
    name: "SKIP", // All “bypass / terminate” tokens land here
    metadata: {
      description: "Noop sink node used to silently terminate excess branches",
    },
    execute() {},
  });

  graph.addNode(skipNode);

  workflow.nodes.forEach((node) => {
    graph.addNode({
      name: node.id,
      metadata: {
        kind: node.kind,
      },
      async execute(state) {
        const executor = getExecutorByKind(node.kind as NodeKind);
        const output = await executor({
          node: convertDBNodeToUINode(node).data,
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
    if (node.kind === NodeKind.Condition) {
      graph.dynamicEdge(node.id, (state) => {
        const branch = state.getOutput({
          nodeId: node.id,
          path: ["branch"],
        });

        if (!branch) return;

        const next = workflow.edges
          .filter((edge) => edge.uiConfig.sourceHandle == branch)
          .map((edge) => edge.target);
        return next;
      });
    } else {
      const targetEdges = workflow.edges
        .filter((edge) => edge.source == node.id)
        .map((v) => v.target);

      if (targetEdges.length) toAny(graph.edge)(node.id, targetEdges);
    }
  });

  let needTable: Record<string, number> = buildNeedTable(workflow.edges);

  const app = graph
    .compile(workflow.nodes.find((node) => node.kind == NodeKind.Start)!.id)
    .use(async ({ name: nodeId, input }, next) => {
      if (!(nodeId in needTable)) return;
      const left = --needTable[nodeId];
      if (left > 0) return next({ name: "SKIP", input });
      delete needTable[nodeId];
      return next();
    });
  app.subscribe((event) => {
    if (event.eventType == "WORKFLOW_START") {
      needTable = buildNeedTable(workflow.edges);
    }
  });

  return app;
};

function buildNeedTable(edges: DBEdge[]): Record<string, number> {
  const map = new Map<string, Set<string>>();
  edges.forEach((e) => {
    const bid = e.uiConfig.label as string;
    (map.get(e.target) ?? map.set(e.target, new Set()).get(e.target))!.add(bid);
  });
  const tbl: Record<string, number> = {};
  map.forEach((set, n) => set.size > 1 && (tbl[n] = set.size));
  return tbl;
}
