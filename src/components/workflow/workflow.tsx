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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { extractWorkflowDiff } from "lib/ai/workflow/extract-workflow-diff";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { createDebounce, generateUUID } from "lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { safe } from "ts-safe";

const nodeTypes = {
  default: DefaultNode,
};

const debounce = createDebounce();

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

  const isProcessing = useMemo(() => {
    return processingIds.length > 0;
  }, [processingIds]);

  const save = () => {
    const processId = generateUUID();
    setProcessingIds((prev) => [...prev, processId]);

    safe()
      .map(() =>
        extractWorkflowDiff(snapshot.current, {
          nodes,
          edges,
        }),
      )
      .ifOk((diff) => {
        if (
          diff.deleteEdges.length ||
          diff.deleteNodes.length ||
          diff.updateEdges.length ||
          diff.updateNodes.length
        ) {
          return fetch(`/api/workflow/${workflowId}`, {
            method: "POST",
            body: JSON.stringify({
              nodes: diff.updateNodes,
              edges: diff.updateEdges,
              deleteNodes: diff.deleteNodes,
              deleteEdges: diff.deleteEdges,
            }),
          }).then((res) => {
            if (res.status >= 400) {
              throw new Error(String(res.statusText || res.status || "Error"));
            }
          });
        }
      })
      .ifOk(() => {
        snapshot.current = {
          edges,
          nodes,
        };
      })
      .ifFail(() => {
        window.location.reload();
      })
      .watch(() =>
        setProcessingIds((prev) => prev.filter((id) => id !== processId)),
      );
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (isProcessing) return;
      setNodes((nds) => applyNodeChanges(changes, nds) as UINode[]);
    },
    [setNodes, isProcessing],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (isProcessing) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges, isProcessing],
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
    [setEdges, isProcessing],
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
        ? 100
        : 10000;
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
        onConnect={onConnect}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitViewOptions={{
          duration: 500,
          padding: 1,
        }}
      >
        <Background gap={12} size={0.6} />
        <Panel position="top-right" className="z-20!">
          <WorkflowPanel
            onSave={save}
            isProcessing={isProcessing}
            nodes={nodes}
            edges={edges}
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
