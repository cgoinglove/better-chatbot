"use client";

import {
  ToolNodeData,
  UINode,
  WorkflowNodeData,
  WorkflowToolKey,
} from "lib/ai/workflow/workflow.interface";
import { memo, useEffect, useMemo } from "react";
import { getFieldKey } from "../../edit-json-schema-field-popup";
import { ChevronDown, VariableIcon } from "lucide-react";

import { useEdges, useNodes, useReactFlow } from "@xyflow/react";
import { selectMcpClientsAction } from "@/app/api/mcp/actions";
import useSWR from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { appStore } from "@/app/store";

import { WorkflowToolSelect } from "../workflow-tool-select";
import { isString, toAny } from "lib/utils";
import { Separator } from "ui/separator";
import { SelectModel } from "@/components/select-model";
import { Button } from "ui/button";
import { OutputSchemaMentionInput } from "../output-schema-mention-input";
import { useWorkflowStore } from "@/app/store/workflow.store";

export const ToolNodeDataConfig = memo(function ({
  data,
}: {
  data: ToolNodeData;
}) {
  const { updateNodeData } = useReactFlow();
  const nodes = useNodes() as UINode[];
  const edges = useEdges();
  const isProcessing = useWorkflowStore((state) => state.processIds.length > 0);

  const { data: mcpList } = useSWR("mcp-list", selectMcpClientsAction, {
    refreshInterval: 1000 * 60 * 1,
    fallbackData: [],
    onError: handleErrorWithToast,
    onSuccess: (data) => {
      appStore.setState({ mcpList: data });
    },
  });

  const toolList = useMemo<WorkflowToolKey[]>(() => {
    const mcpTools: WorkflowToolKey[] = mcpList.flatMap((mcp) => {
      return mcp.toolInfo.map((tool) => {
        return {
          type: "mcp-tool",
          serverId: mcp.id,
          serverName: mcp.name,
          id: tool.name,
          description: tool.description,
          parameterSchema: tool.inputSchema,
        };
      });
    });
    return mcpTools;
  }, [mcpList]);

  useEffect(() => {
    if (!data.model) {
      updateNodeData(data.id, {
        model: appStore.getState().chatModel!,
      });
    }
  }, []);

  return (
    <div className="flex flex-col gap-2 text-sm px-4">
      <p className="text-sm font-semibold">Tool</p>
      <WorkflowToolSelect
        tools={toolList}
        onChange={(tool) => {
          updateNodeData(data.id, { tool });
        }}
        tool={data.tool}
      />
      <p className="text-sm font-semibold my-2">Description & Schema</p>
      {data.tool?.description ||
      Object.keys(data.tool?.parameterSchema?.properties || {}).length > 0 ? (
        <div className="text-xs p-2 bg-background border rounded-md">
          <p>{data.tool?.description}</p>
          {Object.keys(data.tool?.parameterSchema?.properties || {}).length >
            0 && (
            <div className="flex items-center flex-wrap gap-1 mt-2">
              {Object.keys(data.tool?.parameterSchema?.properties || {}).map(
                (key) => {
                  const isRequired =
                    data.tool?.parameterSchema?.required?.includes(key);
                  return (
                    <div
                      key={key}
                      className="mb-0.5 flex items-center text-xs px-1.5 py-0.5 bg-secondary rounded-md"
                    >
                      <VariableIcon className="size-3.5 text-blue-500" />
                      {isRequired && (
                        <span className="text-destructive">*</span>
                      )}
                      <span className="font-semibold">{key}</span>

                      <span className="text-muted-foreground ml-2">
                        {isString(data.tool?.parameterSchema?.properties?.[key])
                          ? data.tool?.parameterSchema?.properties?.[key]
                          : toAny(data.tool?.parameterSchema?.properties?.[key])
                              ?.type || "unknown"}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground text-center py-2 border rounded-md">
          No description And schema
        </div>
      )}

      <Separator className="my-4" />
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold my-2">Message</p>
        <SelectModel
          defaultModel={data.model}
          onSelect={(model) => {
            updateNodeData(data.id, {
              model,
            });
          }}
        >
          <Button
            variant={"outline"}
            size={"sm"}
            className="data-[state=open]:bg-input! hover:bg-input! ml-auto"
          >
            <p className="mr-auto">
              {data.model?.model ?? (
                <span className="text-muted-foreground">model</span>
              )}
            </p>
            <ChevronDown className="size-3" />
          </Button>
        </SelectModel>
      </div>
      <div className="w-full bg-secondary rounded-md p-2 min-h-20">
        <OutputSchemaMentionInput
          currentNodeId={data.id}
          nodes={nodes}
          edges={edges}
          content={data.message}
          editable={!isProcessing}
          onChange={(content) => {
            updateNodeData(data.id, {
              message: content,
            });
          }}
        />
      </div>
    </div>
  );
});
ToolNodeDataConfig.displayName = "ToolNodeDataConfig";

export const ToolNodeStack = memo(function ({
  data,
}: { data: WorkflowNodeData }) {
  const keys = Object.keys(data.outputSchema?.properties ?? {});
  if (!keys.length) return null;
  return (
    <div className="flex flex-col gap-1 px-4 mt-4">
      {keys.map((v) => {
        const schema = data.outputSchema.properties[v];
        return (
          <div
            className="border bg-input text-[10px] rounded px-2 py-1 flex items-center gap-1"
            key={v}
          >
            <VariableIcon className="size-3 text-blue-500" />
            <span>{v}</span>
            <div className="flex-1" />

            <span className="text-[10px] block group-hover/item:hidden text-xs text-muted-foreground">
              <span className=" text-destructive">
                {data.outputSchema.required?.includes(v) ? "*" : " "}
              </span>
              {getFieldKey(schema)}
            </span>
          </div>
        );
      })}
    </div>
  );
});
ToolNodeStack.displayName = "ToolNodeStack";
