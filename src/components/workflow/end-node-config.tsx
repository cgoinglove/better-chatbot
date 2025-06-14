import { EndNode, UINode } from "lib/ai/workflow/interface";
import { useCallback } from "react";
import {
  Feild,
  EditJsonSchemaFieldPopup,
  getFieldKey,
} from "../edit-json-schema-field-popup";
import { PlusIcon, TrashIcon, VariableIcon } from "lucide-react";
import { PencilIcon } from "lucide-react";
import { objectFlow } from "lib/utils";
import { VariableSelect } from "./variable-select";
import { Edge } from "@xyflow/react";
import { addUsageField } from "./helper";

export function EndNodeConfig({
  node: { data },
  setNode,
  nodes,
  edges,
}: {
  node: UINode<EndNode>;
  nodes: UINode[];
  edges: Edge[];
  setNode: (data: Mutate<UINode>) => void;
}) {
  const checkRequired = useCallback(
    (key: string) => {
      return data.outputSchema.required?.includes(key);
    },
    [data.outputSchema],
  );

  const addField = useCallback((field: Feild) => {
    setNode((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        outputSchema: {
          ...prev.data.outputSchema,
          properties: {
            ...prev.data.outputSchema.properties,
            [field.key]: {
              type: field.type,
              enum:
                field.type == "string" && field.enum ? field.enum : undefined,
              description: field.description,
            },
          },
          default: field.defaultValue,
          required: !field.required
            ? prev.data.outputSchema.required?.filter((k) => k != field.key)
            : [...(prev.data.outputSchema.required ?? []), field.key],
        },
      },
    }));
  }, []);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <div>Output Variables</div>
        <VariableSelect
          nodes={nodes}
          edges={edges}
          currentNodeId={data.id}
          onChange={(item) => {
            setNode((prev) => ({
              data: addUsageField(prev.data, item),
            }));
          }}
        >
          <div className="p-1 hover:bg-secondary rounded cursor-pointer">
            <PlusIcon className="size-3" />
          </div>
        </VariableSelect>
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(data.outputSchema.properties ?? {}).map(
          ([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-1 py-1 px-2 bg-secondary rounded group/item border cursor-pointer"
            >
              <VariableIcon className="size-3 text-blue-500" />

              <span>{key}</span>
              <div className="flex-1" />

              <span className="block group-hover/item:hidden text-xs text-muted-foreground">
                <span className="text-[10px] text-destructive">
                  {checkRequired(key) ? "*" : " "}
                </span>
                {getFieldKey(value)}
              </span>
              <div className="hidden group-hover/item:flex items-center gap-1">
                <EditJsonSchemaFieldPopup
                  editAbleKey={false}
                  field={{
                    key,
                    type: value.type as any,
                    description: value.description,
                    enum: value.enum as string[],
                    required: checkRequired(key),
                  }}
                  onChange={addField}
                >
                  <div className="p-1 text-muted-foreground rounded cursor-pointer hover:bg-input">
                    <PencilIcon className="size-3" />
                  </div>
                </EditJsonSchemaFieldPopup>
                <div
                  onClick={() => {
                    setNode((prev) => {
                      return {
                        ...prev,
                        data: {
                          ...prev.data,
                          outputSchema: {
                            ...prev.data.outputSchema,
                            properties: objectFlow(
                              prev.data.outputSchema.properties,
                            ).filter((_, k) => k != key),
                            required: prev.data.outputSchema.required?.filter(
                              (k) => k != key,
                            ),
                          },
                        },
                      };
                    });
                  }}
                  className="p-1 text-destructive rounded cursor-pointer hover:bg-destructive/10"
                >
                  <TrashIcon className="size-3" />
                </div>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
