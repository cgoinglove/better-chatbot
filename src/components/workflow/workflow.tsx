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
import { UINode } from "lib/ai/workflow/interface";
import { useCallback, useEffect, useMemo, useState } from "react";

const nodeTypes = {
  default: DefaultNode,
};

export default function Workflow({
  initialNodes,
  initialEdges,
}: {
  id: string;
  initialNodes: UINode[];
  initialEdges: Edge[];
}) {
  const [nodes, setNodes] = useState<UINode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds) as UINode[]);
    },
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
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

  useEffect(() => {}, []);

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
          <WorkflowPanel nodes={nodes} edges={edges} />
        </Panel>
        <Panel
          position="top-left"
          className="h-full w-full m-0! pointer-events-none!"
        >
          <div className="z-10 absolute inset-0 w-full h-1/12 bg-gradient-to-b to-90% from-background to-transparent  pointer-events-none" />
          <div className="z-10 absolute inset-0 w-1/12 h-full bg-gradient-to-r from-background to-transparent  pointer-events-none" />
          <div className="z-10 absolute left-0 bottom-0 w-full h-1/12 bg-gradient-to-t from-background to-transparent  pointer-events-none" />
          <div className="z-10 absolute right-0 bottom-0 w-1/12 h-full bg-gradient-to-l from-background to-transparent  pointer-events-none" />
        </Panel>
      </ReactFlow>
    </div>
  );
}
