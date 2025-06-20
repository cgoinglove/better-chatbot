import { ObjectJsonSchema7 } from "app-types/util";
import { JSONSchema7 } from "json-schema";
import { OutputSchemaSourceKey, WorkflowNode } from "./interface";

const variableIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-variable size-3.5 text-blue-500"><path d="M8 21s-4-3-4-9 4-9 4-9"></path><path d="M16 3s4 3 4 9-4 9-4 9"></path><line x1="15" x2="9" y1="9" y2="15"></line><line x1="9" x2="15" y1="9" y2="15"></line></svg>`;
const errorIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert size-3 text-destructive"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
export function createVariableMentionLabel({
  nodeName,
  path,
  notFound,
}: {
  nodeName: string;
  path: string[];
  notFound?: boolean;
}) {
  return `${notFound ? errorIcon : variableIcon}<span class="text-foreground">${nodeName}/</span>${path.join(".")}`;
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
  source: OutputSchemaSourceKey;
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
