import { ObjectJsonSchema7 } from "app-types/util";
import { NodeKind, WorkflowNodeData } from "../workflow.interface";
import {
  defaultObjectJsonSchema,
  findJsonSchemaByPath,
} from "../shared.workflow";
import { JSONSchema7 } from "json-schema";

export function extractNodeDependencySchema({
  targetId,
  nodes,
}: {
  targetId: string;
  nodes: WorkflowNodeData[];
}): ObjectJsonSchema7 {
  const schema = structuredClone(defaultObjectJsonSchema);
  const target = nodes.find((node) => node.id === targetId);
  if (!target) {
    return schema;
  }

  if (target.kind === NodeKind.Input) {
    return target.outputSchema;
  }
  if (target.kind === NodeKind.Output) {
    const properties = target.outputData.reduce(
      (acc, cur) => {
        if (!cur.key) return acc;
        acc[cur.key] = {
          type: "string", // default
        };
        const source = cur.source;
        if (!source) return acc;
        const sourceNode = nodes.find((node) => node.id === source.nodeId);
        if (!sourceNode) return acc;
        const sourceSchema = findJsonSchemaByPath(
          sourceNode.outputSchema,
          source.path,
        );
        acc[cur.key] = sourceSchema || { type: "string" };
        return acc;
      },
      {} as Record<string, JSONSchema7>,
    );
    schema.properties = properties;
    return schema;
  }

  return schema;
}
