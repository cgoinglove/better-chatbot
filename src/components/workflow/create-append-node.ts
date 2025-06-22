"use client";
import { appStore } from "@/app/store";
import { Edge } from "@xyflow/react";
import { generateUINode } from "lib/ai/workflow/shared.workflow";
import {
  LLMNodeData,
  NodeKind,
  UINode,
} from "lib/ai/workflow/workflow.interface";
import { generateUniqueKey, generateUUID } from "lib/utils";

export function createAppendNode({
  sourceNode,
  kind,
  edge,
  allNodes,
  allEdges,
}: {
  sourceNode: UINode;
  kind: NodeKind;
  edge?: Partial<Edge>;
  allNodes: UINode[];
  allEdges: Edge[];
}): { node: UINode; edge?: Edge } {
  const connectors = allEdges
    .filter((edge) => edge.source === sourceNode.id)
    .map((v) => v.target);

  const connectedNodes = allNodes.filter((node) =>
    connectors.includes(node.id),
  );

  const maxY = Math.max(
    ...connectedNodes.map(
      (node) => node.position.y + (node.measured?.height ?? 0),
    ),
  );

  const names = allNodes.map((node) => node.data.name as string);
  const name = generateUniqueKey(kind.toUpperCase(), names);

  const node = generateUINode(kind, {
    name,
    position: {
      x: sourceNode.position.x + 300 * 1.2,
      y: !connectedNodes.length ? sourceNode.position.y : maxY + 80,
    },
  });

  if (kind === NodeKind.LLM) {
    (node.data as LLMNodeData).model = appStore.getState().chatModel! ?? {};
  }
  if (kind === NodeKind.Information) {
    return {
      node,
    };
  }

  return {
    node,
    edge: {
      id: generateUUID(),
      source: sourceNode.id,
      target: node.id,
      ...edge,
    },
  };
}
