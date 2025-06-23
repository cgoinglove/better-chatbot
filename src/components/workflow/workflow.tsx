"use client";

import { DefaultNode } from "@/components/workflow/default-node";
import { WorkflowPanel } from "@/components/workflow/workflow-panel";
import {
  ReactFlow,
  Background,
  Panel,
  Edge,
  applyNodeChanges,
  OnNodesChange,
  OnEdgesChange,
  applyEdgeChanges,
  addEdge,
  OnConnect,
  OnSelectionChangeFunc,
  NodeMouseHandler,
  IsValidConnection,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { extractWorkflowDiff } from "lib/ai/workflow/extract-workflow-diff";
import {
  convertUIEdgeToDBEdge,
  convertUINodeToDBNode,
} from "lib/ai/workflow/shared.workflow";
import { NodeKind, UINode } from "lib/ai/workflow/workflow.interface";
import { wouldCreateCycle } from "lib/ai/workflow/would-create-cycle";
import { createDebounce, generateUUID } from "lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { safe } from "ts-safe";

const nodeTypes = {
  default: DefaultNode,
};

const debounce = createDebounce();

const fitViewOptions = {
  duration: 500,
  padding: 1,
};

export default function Workflow({
  initialNodes,
  initialEdges,
  workflowId,
}: {
  workflowId: string;
  initialNodes: UINode[];
  initialEdges: Edge[];
}) {
  const [nodes, setNodes] = useState<UINode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);

  const snapshot = useRef({ nodes: initialNodes, edges: initialEdges });

  const startProcessing = useCallback(() => {
    const processId = generateUUID();
    setProcessingIds((prev) => [...prev, processId]);
    return () => {
      setProcessingIds((prev) => prev.filter((id) => id !== processId));
    };
  }, []);

  const isProcessing = useMemo(() => {
    return processingIds.length > 0;
  }, [processingIds]);

  const save = () => {
    const stop = startProcessing();
    safe()
      .map(() => saveWorkflow(workflowId, snapshot.current, { nodes, edges }))
      .ifOk(() => {
        snapshot.current = {
          edges,
          nodes,
        };
      })
      .ifFail(() => {
        window.location.reload();
      })
      .watch(stop);
  };

  const selectedNode = useMemo(() => {
    return nodes.findLast((node) => node.selected);
  }, [nodes]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (isProcessing) return;
      setNodes((nds) => applyNodeChanges(changes, nds) as UINode[]);
    },
    [isProcessing],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (isProcessing) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [isProcessing],
  );
  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (isProcessing) return;
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: generateUUID(),
          },
          eds,
        ),
      );
    },
    [isProcessing],
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (isProcessing) return;
      setActiveNodeIds(selectedNodes.map((node) => node.id));
    },
    [isProcessing],
  );
  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (_, node) => {
      if (isProcessing) return;
      setActiveNodeIds((prev) => {
        return prev.includes(node.id) ? prev : [...prev, node.id];
      });
    },
    [isProcessing],
  );

  const onNodeMouseLeave: NodeMouseHandler = useCallback(
    (_, node) => {
      if (isProcessing) return;
      setActiveNodeIds((prev) => prev.filter((id) => id !== node.id));
    },
    [isProcessing],
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (isProcessing) return false;
      if (connection.source === connection.target) return false;
      return !wouldCreateCycle(connection as Connection, edges as Connection[]);
    },
    [isProcessing, edges],
  );

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const isConnected =
        activeNodeIds.includes(edge.source) ||
        activeNodeIds.includes(edge.target);
      const isConditionEdge = Boolean(
        edge.sourceHandle && edge.sourceHandle != "right",
      );
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isConnected ? "oklch(62.3% 0.214 259.815)" : undefined,
          strokeWidth: 2,
          transition: "stroke 0.3s",
        },
        animated: isConditionEdge,
      };
    });
  }, [edges, activeNodeIds]);

  useEffect(() => {
    const debounceDelay =
      snapshot.current.nodes.length !== nodes.length ||
      snapshot.current.edges.length !== edges.length
        ? 200
        : 5000;
    debounce(save, debounceDelay);
  }, [nodes, edges]);

  useEffect(() => {
    setNodes((nds) => {
      return nds.map((node) => {
        if (node.data.kind === NodeKind.Start && !node.selected) {
          return { ...node, selected: true };
        }
        return node;
      });
    });
  }, []);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        fitView
        deleteKeyCode={null}
        nodes={nodes}
        edges={styledEdges}
        multiSelectionKeyCode={null}
        id={workflowId}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        isValidConnection={isValidConnection}
        onConnect={onConnect}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitViewOptions={fitViewOptions}
      >
        <Background gap={12} size={0.6} />
        <Panel position="top-right" className="z-20!">
          <WorkflowPanel
            onSave={save}
            isProcessing={isProcessing}
            startProcessing={startProcessing}
            selectedNode={selectedNode}
            workflowId={workflowId}
          />
        </Panel>
        <Panel
          position="top-left"
          className="h-full w-full m-0! pointer-events-none!"
        >
          <div className="z-10 absolute inset-0 w-full h-1/12 bg-gradient-to-b to-90% from-background to-transparent  pointer-events-none" />
          <div className="z-10 absolut  e inset-0 w-1/12 h-full bg-gradient-to-r from-background to-transparent  pointer-events-none" />
          <div className="z-10 absolute left-0 bottom-0 w-full h-1/12 bg-gradient-to-t from-background to-transparent  pointer-events-none" />
          <div className="z-10 absolute right-0 bottom-0 w-1/12 h-full bg-gradient-to-l from-background to-transparent  pointer-events-none" />
        </Panel>
      </ReactFlow>
    </div>
  );
}

function saveWorkflow(
  workflowId: string,
  before: { nodes: UINode[]; edges: Edge[] },
  after: { nodes: UINode[]; edges: Edge[] },
) {
  const diff = extractWorkflowDiff(before, after);

  if (
    diff.deleteEdges.length ||
    diff.deleteNodes.length ||
    diff.updateEdges.length ||
    diff.updateNodes.length
  ) {
    return fetch(`/api/workflow/${workflowId}/structure`, {
      method: "POST",
      body: JSON.stringify({
        nodes: diff.updateNodes.map((node) =>
          convertUINodeToDBNode(workflowId, node),
        ),
        edges: diff.updateEdges.map((edge) =>
          convertUIEdgeToDBEdge(workflowId, edge),
        ),
        deleteNodes: diff.deleteNodes.map((node) => node.id),
        deleteEdges: diff.deleteEdges.map((edge) => edge.id),
      }),
    }).then((res) => {
      if (res.status >= 400) {
        throw new Error(String(res.statusText || res.status || "Error"));
      }
    });
  }

  return Promise.resolve();
}
