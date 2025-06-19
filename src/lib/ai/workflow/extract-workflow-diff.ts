import { Edge } from "@xyflow/react";
import { NodeKind, UINode } from "./interface";
import equal from "fast-deep-equal";

function normalizeNode(node: UINode) {
  let nodeDataByKind: any[] = [];

  switch (node.data.kind) {
    case NodeKind.LLM: {
      nodeDataByKind = [node.data.model, node.data.messages];
      break;
    }
    case NodeKind.End: {
      nodeDataByKind = [node.data.outputData];
      break;
    }
  }

  return {
    id: node.id,
    data: nodeDataByKind,
    outputSchema: { ...node.data.outputSchema },
    name: node.data.name || "",
    description: node.data.description || "",
    position: { ...node.position },
  };
}
function normalizeEdge(edge: Edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
  };
}

export function extractWorkflowDiff(
  oldData: { nodes: UINode[]; edges: Edge[] },
  newData: { nodes: UINode[]; edges: Edge[] },
) {
  const deleteNodes: UINode[] = [];
  const deleteEdges: Edge[] = [];
  const updateNodes: UINode[] = [];
  const updateEdges: Edge[] = [];

  const oldNodes = oldData.nodes;
  const newNodes = new Map<string, UINode>(
    newData.nodes.map((node) => [node.id, node]),
  );

  oldNodes.forEach((node) => {
    const newNode = newNodes.get(node.id);
    if (!newNode) {
      deleteNodes.push(node);
    } else if (!equal(normalizeNode(node), normalizeNode(newNode))) {
      updateNodes.push(newNode);
    }

    newNodes.delete(node.id);
  });

  updateNodes.push(...newNodes.values());

  const oldEdges = oldData.edges;
  const newEdges = new Map<string, Edge>(
    newData.edges.map((edge) => [edge.id, edge]),
  );

  oldEdges.forEach((edge) => {
    const newEdge = newEdges.get(edge.id);
    if (!newEdge) {
      deleteEdges.push(edge);
    } else if (!equal(normalizeEdge(edge), normalizeEdge(newEdge))) {
      updateEdges.push(newEdge);
    }
    newEdges.delete(edge.id);
  });

  updateEdges.push(...newEdges.values());
  return {
    deleteNodes,
    deleteEdges,
    updateNodes,
    updateEdges,
  };
}
