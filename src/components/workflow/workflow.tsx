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
import { UINode } from "lib/ai/workflow/interface";
import { createDebounce, wait } from "lib/utils";
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
  const [isProcessing, setIsProcessing] = useState(false);

  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);

  const snapshot = useRef({ nodes: initialNodes, edges: initialEdges });

  const save = () => {
    console.log(`trigger`, {
      prev: nodes,
      next: snapshot.current.nodes,
    });
    setIsProcessing(true);
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
              nodes,
              edges,
            }),
          }).then((res) => {
            if (res.status > 300) {
              throw new Error(String(res.statusText || res.status || "Error"));
            }
            return wait(5000);
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
      .watch(() => setIsProcessing(false));
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (isProcessing) return;
      setNodes((nds) => applyNodeChanges(changes, nds) as UINode[]);
    },
    [setNodes],
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
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges, isProcessing],
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      setActiveNodeIds(selectedNodes.map((node) => node.id));
    },
    [],
  );
  const onNodeMouseEnter: NodeMouseHandler = useCallback((_, node) => {
    setActiveNodeIds((prev) => {
      return prev.includes(node.id) ? prev : [...prev, node.id];
    });
  }, []);

  const onNodeMouseLeave: NodeMouseHandler = useCallback((_, node) => {
    setActiveNodeIds((prev) => prev.filter((id) => id !== node.id));
  }, []);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const isConnected =
        activeNodeIds.includes(edge.source) ||
        activeNodeIds.includes(edge.target);
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isConnected ? "oklch(62.3% 0.214 259.815)" : undefined,
          strokeWidth: 2,
          transition: "stroke 0.3s",
        },
      };
    });
  }, [edges, activeNodeIds]);

  useEffect(() => {
    debounce(save, 3000); // auto save 10s
  }, [nodes, edges]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        fitView
        deleteKeyCode={null}
        nodes={nodes}
        edges={styledEdges}
        multiSelectionKeyCode={null}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onConnect={onConnect}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitViewOptions={{
          duration: 500,
          padding: 8,
        }}
      >
        <Background gap={12} size={0.6} />
        <Panel position="top-right" className="h-full z-20!">
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
