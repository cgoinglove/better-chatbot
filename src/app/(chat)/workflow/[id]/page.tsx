"use client";
import { DefaultNode } from "@/components/workflow/default-node";
import { generateInitialNode } from "@/components/workflow/helper";
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
import { NodeKind, UINode, WorkflowNode } from "lib/ai/workflow/interface";
import { useCallback, useState } from "react";

const nodeTypes = {
  default: DefaultNode,
};

const initialNodes: UINode<WorkflowNode>[] = [
  generateInitialNode(NodeKind.Start, {
    data: {
      name: "START",
    },
  }),
];

const initialEdges = [];

export default function WorkflowPage() {
  const [nodes, setNodes] = useState<UINode<WorkflowNode>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes(
        (nds) => applyNodeChanges(changes, nds) as UINode<WorkflowNode>[],
      );
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
