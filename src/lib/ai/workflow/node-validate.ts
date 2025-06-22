import { Edge } from "@xyflow/react";
import { JSONSchema7 } from "json-schema";
import {
  ConditionNode,
  EndNode,
  LLMNode,
  NodeKind,
  StartNode,
  UINode,
  WorkflowNode,
} from "lib/ai/workflow/interface";
import { cleanVariableName } from "lib/utils";
import { safe } from "ts-safe";
import { findJsonSchemaByPath } from "./shared";

export function validateSchema(key: string, schema: JSONSchema7) {
  const variableName = cleanVariableName(key);
  if (variableName.length === 0) {
    throw new Error("Invalid Variable Name");
  }
  if (variableName.length > 255) {
    throw new Error("Variable Name is too long");
  }
  if (!schema.type) {
    throw new Error("Invalid Schema");
  }
  if (schema.type == "array" || schema.type == "object") {
    const keys = Array.from(Object.keys(schema.properties ?? {}));
    if (keys.length != new Set(keys).size) {
      throw new Error("Output data must have unique keys");
    }
    return keys.every((key) => {
      return validateSchema(key, schema.properties![key] as JSONSchema7);
    });
  }
  return true;
}

type NodeValidate<T> = (context: {
  node: T;
  nodes: UINode[];
  edges: Edge[];
}) => void;

export function allNodeValidate({
  nodes,
  edges,
}: { nodes: UINode[]; edges: Edge[] }):
  | true
  | {
      node: UINode;
      errorMessage: string;
    } {
  if (!nodes.some((n) => n.data.kind === NodeKind.Start)) {
    throw new Error("Start node must be only one");
  }
  if (!nodes.some((n) => n.data.kind === NodeKind.End)) {
    throw new Error("End node must be only one");
  }

  for (const node of nodes) {
    const result = safe()
      .ifOk(() => nodeValidate({ node: node.data, nodes, edges }))
      .ifFail((err) => {
        return {
          node,
          errorMessage: err.message,
        };
      })
      .unwrap();
    if (result) {
      return result;
    }
  }
  return true;
}

export const nodeValidate: NodeValidate<WorkflowNode> = ({
  node,
  nodes,
  edges,
}) => {
  if (
    node.kind != NodeKind.Information &&
    nodes.filter((n) => n.data.name === node.name).length > 1
  ) {
    throw new Error("Node name must be unique");
  }
  switch (node.kind) {
    case NodeKind.Start:
      return startNodeValidate({ node, nodes, edges });
    case NodeKind.End:
      return endNodeValidate({ node, nodes, edges });
    case NodeKind.LLM:
      return llmNodeValidate({ node, nodes, edges });
  }
};

export const startNodeValidate: NodeValidate<StartNode> = ({ node, edges }) => {
  if (!edges.some((e) => e.source === node.id)) {
    throw new Error("Start node must have an edge");
  }
  const outputKeys = Array.from(
    Object.keys(node.outputSchema.properties ?? {}),
  );
  if (outputKeys.length === 0) {
    throw new Error("Start node must have an Inputs");
  }
  outputKeys.forEach((key) => {
    validateSchema(key, node.outputSchema.properties![key] as JSONSchema7);
  });
};

export const endNodeValidate: NodeValidate<EndNode> = ({
  node,
  nodes,
  edges,
}) => {
  const names = node.outputData.map((data) => data.key);
  const uniqueNames = [...new Set(names)];
  if (names.length !== uniqueNames.length) {
    throw new Error("Output data must have unique keys");
  }
  node.outputData.forEach((data) => {
    const variableName = cleanVariableName(data.key);
    if (variableName.length === 0) {
      throw new Error("Invalid Variable Name");
    }
    if (variableName.length > 255) {
      throw new Error("Variable Name is too long");
    }
    if (!data.source) throw new Error("Output data must have a source");
    if (data.source.path.length === 0)
      throw new Error("Output data must have a path");
    const sourceNode = nodes.find((n) => n.data.id === data.source?.nodeId);
    if (!sourceNode) throw new Error("Source node not found");
    const sourceSchema = findJsonSchemaByPath(
      sourceNode.data.outputSchema,
      data.source.path,
    );
    if (!sourceSchema) throw new Error("Source schema not found");
  });

  let current: WorkflowNode | undefined = node as WorkflowNode;
  while (current && current.kind !== NodeKind.Start) {
    const prevNodeId = edges.find((e) => e.target === current!.id)?.source;
    if (!prevNodeId) throw new Error("Prev node must have an edge");
    const prevNode = nodes.find((n) => n.data.id === prevNodeId);
    if (!prevNode) current = undefined;
    else current = prevNode.data as WorkflowNode;
  }

  if (current?.kind !== NodeKind.Start)
    throw new Error("Prev node must be a start node");
};

export const llmNodeValidate: NodeValidate<LLMNode> = ({ node }) => {
  if (!node.model) throw new Error("LLM node must have a model");
  node.messages.map((message) => {
    if (!message.role) throw new Error("LLM node must have a role");
    if (!message.content) throw new Error("LLM node must have a content");
  });
  if (node.messages.length === 0)
    throw new Error("LLM node must have a message");
};

export const conditionNodeValidate: NodeValidate<ConditionNode> = ({
  node,
}) => {
  [node.branches.if, ...(node.branches.elseIf ?? [])].forEach((branch) => {
    if (!branch.conditions?.length)
      throw new Error("Condition node must have a condition");
  });
};
