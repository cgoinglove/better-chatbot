import { ObjectJsonSchema7 } from "app-types/util";
import { JSONSchema7 } from "json-schema";
import { OutputSchemaSource, WorkflowNode } from "./interface";

export function createVariableMentionLabel({
  nodeName,
  path,
  notFound,
}: {
  nodeName: string;
  path: string[];
  notFound?: boolean;
}) {
  return `${notFound ? "<span class='text-destructive'>X</span>" : ""}<span class="text-foreground">${nodeName}/</span>${path.join(".")}`;
}

export function findAccessibleNodeIds({
  nodeId,
  nodes,
  edges,
}: {
  nodeId: string;
  nodes: WorkflowNode[];
  edges: { target: string; source: string }[];
}): string[] {
  const accessibleNodes: string[] = [];
  const allNodeIds = nodes.map((node) => node.id);
  let currentNodes = [nodeId];
  while (currentNodes.length > 0) {
    const targets = [...currentNodes];
    currentNodes = [];
    for (const target of targets) {
      const sources = edges
        .filter(
          (edge) => edge.target === target && allNodeIds.includes(edge.source),
        )
        .map((edge) => edge.source);
      accessibleNodes.push(...sources);
      currentNodes.push(...sources);
    }
  }
  return accessibleNodes;
}

export function findJsonSchemaByPath(
  schema: ObjectJsonSchema7,
  path: string[],
): JSONSchema7 | undefined {
  const [key, ...rest] = path;
  if (rest.length === 0) {
    return schema.properties?.[key] as JSONSchema7;
  }
  return findJsonSchemaByPath(
    schema.properties![key] as ObjectJsonSchema7,
    rest,
  );
}
export function findUseageSchema({
  nodeId,
  source,
  nodes,
  edges,
}: {
  nodeId: string;
  source: OutputSchemaSource;
  nodes: WorkflowNode[];
  edges: { target: string; source: string }[];
}): JSONSchema7 | undefined {
  const accessibleNodes = findAccessibleNodeIds({
    nodeId,
    nodes,
    edges,
  });
  if (!accessibleNodes.includes(source.nodeId)) return;
  const sourceNode = nodes.find((node) => node.id === source.nodeId)!;
  return findJsonSchemaByPath(sourceNode.outputSchema, source.path);
}
