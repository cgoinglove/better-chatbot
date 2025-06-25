import { NodeKind } from "../workflow.interface";
import { createGraphStore, WorkflowRuntimeState } from "./graph-store";
import { createStateGraph, graphNode, StateGraphRegistry } from "ts-edge";
import {
  conditionNodeExecutor,
  outputNodeExecutor,
  llmNodeExecutor,
  NodeExecutor,
  inputNodeExecutor,
  toolNodeExecutor,
} from "./node-executor";
import { toAny } from "lib/utils";
import { addEdgeBranchLabel } from "./add-edge-branch-label";
import { DBEdge, DBNode } from "app-types/workflow";
import { convertDBNodeToUINode } from "../shared.workflow";
import globalLogger from "logger";
import { ConsolaInstance } from "consola";
import { colorize } from "consola/utils";

function getExecutorByKind(kind: NodeKind): NodeExecutor {
  switch (kind) {
    case NodeKind.Input:
      return inputNodeExecutor;
    case NodeKind.Output:
      return outputNodeExecutor;
    case NodeKind.LLM:
      return llmNodeExecutor;
    case NodeKind.Condition:
      return conditionNodeExecutor;
    case NodeKind.Tool:
      return toolNodeExecutor;
    case "NOOP" as any:
      return () => {
        return {
          input: {},
          output: {},
        };
      };
  }
  return () => {
    console.warn(`Undefined '${kind}' Node Executor`);
    return {};
  };
}

export const createWorkflowExecutor = (workflow: {
  nodes: DBNode[];
  edges: DBEdge[];
  logger?: ConsolaInstance;
}) => {
  const store = createGraphStore({
    nodes: workflow.nodes,
    edges: workflow.edges,
  });
  const logger =
    workflow.logger ??
    globalLogger.withDefaults({
      message: colorize("cyan", `Workflow Executor:`),
    });

  const nodeNameByNodeId = new Map<string, string>(
    workflow.nodes.map((node) => [node.id, node.name]),
  );

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
    execute() {
      logger.debug("Noop sink node used to silently terminate excess branches");
    },
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
        const result = await executor({
          node: convertDBNodeToUINode(node).data,
          state,
        });

        if (result?.output) {
          state.setOutput(
            {
              nodeId: node.id,
              path: [],
            },
            result.output,
          );
        }
        if (result?.input) {
          state.setInput(node.id, result.input);
        }
      },
    });
    if (node.kind === NodeKind.Condition) {
      graph.dynamicEdge(node.id, (state) => {
        const next = state.getOutput({
          nodeId: node.id,
          path: ["nextNodes"],
        }) as DBNode[];
        if (!next) return;
        return next.map((node) => node.id);
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
    .compile(workflow.nodes.find((node) => node.kind == NodeKind.Input)!.id)
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
      logger.debug(
        `[${event.eventType}] ${workflow.nodes.length} nodes, ${workflow.edges.length} edges`,
      );
    } else if (event.eventType == "WORKFLOW_END") {
      const duration = ((event.endedAt - event.startedAt) / 1000).toFixed(2);
      const color = event.isOk ? "green" : "red";
      logger.debug(
        `[${event.eventType}] ${colorize(color, event.isOk ? "SUCCESS" : "FAILED")} ${duration}s`,
      );
      if (!event.isOk) {
        logger.error(event.error);
      }
    } else if (event.eventType == "NODE_START") {
      logger.debug(
        `[${event.eventType}] ${nodeNameByNodeId.get(event.node.name)}`,
      );
    } else if (event.eventType == "NODE_END") {
      const duration = ((event.endedAt - event.startedAt) / 1000).toFixed(2);
      const color = event.isOk ? "green" : "red";
      logger.debug(
        `[${event.eventType}] ${nodeNameByNodeId.get(event.node.name)} ${colorize(color, event.isOk ? "SUCCESS" : "FAILED")} ${duration}s`,
      );
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
