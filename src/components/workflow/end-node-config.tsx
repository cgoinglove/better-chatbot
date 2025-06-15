"use client";

import { EndNode, NodeKind, UINode } from "lib/ai/workflow/interface";
import { useCallback, useMemo } from "react";

import {
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  VariableIcon,
} from "lucide-react";

import { VariableSelect } from "./variable-select";
import { Edge } from "@xyflow/react";
import { addUsageField, findSchemaByPath } from "./helper";
import { Input } from "ui/input";
import { Button } from "ui/button";

export function EndNodeConfig({
  node: { data },
  setNode,
  nodes,
  edges,
}: {
  node: UINode<NodeKind.End>;
  nodes: UINode[];
  edges: Edge[];
  setNode: (data: Mutate<UINode>) => void;
}) {
  const outputVariables = useMemo(() => {
    return data.outputData.map(({ key, source }) => {
      const targetNode = nodes.find((node) => node.data.id === source?.nodeId);
      const schema = findSchemaByPath(
        targetNode?.data.outputSchema ?? {},
        source?.path ?? [],
      );
      return {
        key,
        schema,
        path: source?.path ?? [],
        nodeName: targetNode?.data.name,
        nodeId: targetNode?.data.id,
      };
    });
  }, [data.outputSchema, nodes]);

  const updateOutputVariable = useCallback(
    (
      index: number,
      item: { key?: string; source?: { nodeId: string; path: string[] } },
    ) => {
      setNode((prev) => ({
        data: {
          ...prev.data,
          outputData: (prev.data as EndNode).outputData.map((v, i) =>
            i === index ? { ...v, ...item } : v,
          ),
        },
      }));
    },
    [],
  );
  const deleteOutputVariable = useCallback((index: number) => {
    setNode((prev) => {
      return {
        data: {
          ...prev.data,
          outputData: (prev.data as EndNode).outputData.filter(
            (_, i) => i !== index,
          ),
        },
      };
    });
  }, []);

  const addOutputVariable = useCallback((key: string = "") => {
    setNode((prev) => {
      let newKey = key;
      let counter = 1;

      while ((prev.data as EndNode).outputData.find((v) => v.key === newKey)) {
        const baseKey = key.replace(/\d+$/, "");
        const hasOriginalNumber = key !== baseKey;
        if (hasOriginalNumber) {
          const originalNumber = parseInt(key.match(/\d+$/)?.[0] || "0");
          newKey = baseKey + (originalNumber + counter);
        } else {
          newKey = baseKey + counter;
        }
        counter++;
      }
      return {
        data: {
          ...prev.data,
          outputData: [
            ...(prev.data as EndNode).outputData,
            { key: newKey, source: undefined },
          ],
        },
      };
    });
  }, []);

  return (
    <div className="flex flex-col gap-2 text-sm ">
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
      <div className="flex flex-col gap-2">
        {outputVariables.map((item, index) => {
          return (
            <div className="flex items-center gap-1" key={index}>
              <Input
                value={item.key}
                onChange={(e) => {
                  updateOutputVariable(index, { key: e.target.value });
                }}
                className="w-24"
                placeholder="name"
              />
              <VariableSelect
                currentNodeId={data.id}
                nodes={nodes}
                edges={edges}
                item={{
                  nodeId: item.nodeId ?? "",
                  path: item.path,
                }}
                onChange={(item) => {
                  updateOutputVariable(index, {
                    source: item,
                  });
                }}
              >
                <div className="flex-1 min-w-0 w-full flex text-[10px] items-center gap-1 p-2.5 border border-input bg-background rounded-lg cursor-pointer">
                  <VariableIcon className="size-3 text-blue-500" />
                  <span>{item.nodeName}/</span>
                  <span className="truncate min-w-0 text-blue-500 flex-1">
                    {item.path.join(".")}
                  </span>
                  <span className="text-muted-foreground">
                    {item.schema?.type}
                  </span>

                  <ChevronDownIcon className="size-3 ml-auto" />
                </div>
              </VariableSelect>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteOutputVariable(index)}
              >
                <TrashIcon />
              </Button>
            </div>
          );
        })}
        <Button
          variant="ghost"
          onClick={() => {
            addOutputVariable("text");
          }}
          className="w-full border-dashed border text-muted-foreground"
        >
          <PlusIcon /> Add Output
        </Button>
      </div>
    </div>
  );
}
