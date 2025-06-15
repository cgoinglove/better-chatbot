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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { UINode } from "lib/ai/workflow/interface";
import { useCallback, useState } from "react";

const nodeTypes = {
  default: DefaultNode,
};

export default function Workflow({
  initialNodes,
  initialEdges,
}: {
  initialNodes: UINode[];
  initialEdges: Edge[];
}) {
  const [nodes, setNodes] = useState<UINode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

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
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        multiSelectionKeyCode={null}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <Background gap={12} size={0.6} />

        <Panel position="top-right" className="h-full">
          <WorkflowPanel nodes={nodes} edges={edges} setNodes={setNodes} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
