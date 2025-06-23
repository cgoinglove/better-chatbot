"use client";

import { memo, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Separator } from "@/components/ui/separator";

import { NodeKind, UINode } from "lib/ai/workflow/workflow.interface";
import { NodeIcon } from "./node-icon";
import { fetcher, nextTick, wait } from "lib/utils";
import {
  Loader,
  LockIcon,
  MoreHorizontalIcon,
  PlayIcon,
  XIcon,
} from "lucide-react";
import { Button } from "ui/button";
import { StartNodeDataConfig } from "./node-config/start-node-config";
import { EndNodeDataConfig } from "./node-config/end-node-config";
import { Label } from "ui/label";
import { useNodes, useReactFlow } from "@xyflow/react";
import { NodeRun } from "./node-run";
import { LLMNodeDataConfig } from "./node-config/llm-node-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { NodeContextMenuContent } from "./node-context-menu-content";
import { NextNodeInfo } from "./next-node-info";
import { ConditionNodeDataConfig } from "./node-config/condition-node-config";
import equal from "fast-deep-equal";
import useSWR from "swr";
import { Switch } from "ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { useObjectState } from "@/hooks/use-object-state";
import { FlipWords } from "ui/flip-words";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { toast } from "sonner";
import { allNodeValidate } from "lib/ai/workflow/node-validate";

export const WorkflowPanel = memo(
  function WorkflowPanel({
    selectedNode,
    isProcessing,
    workflowId,
    onSave,
    startProcessing,
  }: {
    selectedNode?: UINode;
    workflowId: string;
    startProcessing: () => () => void;
    onSave: () => void;
    isProcessing: boolean;
  }) {
    const [showExecutePanel, setShowExecutePanel] = useState(true);

    const { data: workflow } = useSWR(`/api/workflow/${workflowId}`, fetcher);

    const handleRun = (input: Record<string, any>) => {
      console.log({ input });
      const stop = startProcessing();
      wait(8000).then(() => stop());
    };

    return (
      <div className="min-h-0 flex flex-col items-end">
        <div className="flex items-center gap-2 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                style={{
                  backgroundColor: workflow?.icon.style?.backgroundColor,
                }}
                className="transition-colors hover:bg-secondary! group items-center justify-center flex w-8 h-8 rounded-md ring ring-background hover:ring-ring"
              >
                <Avatar className="size-6">
                  <AvatarImage
                    src={workflow?.icon.value}
                    className="group-hover:scale-110  transition-transform"
                  />
                  <AvatarFallback></AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{workflow?.name}</p>
            </TooltipContent>
          </Tooltip>
          <div className="h-6">
            <Separator orientation="vertical" />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowExecutePanel(!showExecutePanel)}
          >
            <PlayIcon />
            Execute
          </Button>

          <Button
            disabled={isProcessing}
            onClick={onSave}
            variant="default"
            className="w-16"
          >
            {isProcessing ? (
              <Loader className="size-3.5 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
          <div className="h-6">
            <Separator orientation="vertical" />
          </div>
          <Button variant="secondary" size="icon" disabled>
            <LockIcon />
          </Button>
        </div>
        <div className="flex gap-2">
          {selectedNode && <NodeDetailPanel node={selectedNode} />}
          {showExecutePanel && (
            <ExecutePanel
              onRun={handleRun}
              isProcessing={isProcessing}
              close={() => setShowExecutePanel(false)}
            />
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    if (prev.isProcessing !== next.isProcessing) {
      return false;
    }
    if (Boolean(prev.selectedNode) !== Boolean(next.selectedNode)) {
      return false;
    }
    if (!equal(prev.selectedNode?.data, next.selectedNode?.data)) {
      return false;
    }
    return true;
  },
);

function ExecutePanel({
  close,
  isProcessing,
  onRun,
}: {
  close: () => void;
  isProcessing: boolean;
  onRun(input: Record<string, any>): void;
}) {
  const { getEdges, getNodes, updateNode } = useReactFlow<UINode>();
  const nodes = getNodes();

  const [inputs, setInputs] = useObjectState({} as Record<string, any>);

  const startNodeData = useMemo(() => {
    return nodes.find((node) => node.data.kind === NodeKind.Start)!.data;
  }, [nodes]);

  const inputSchema = useMemo(() => {
    return startNodeData.outputSchema;
  }, [startNodeData]);

  const inputSchemaIterator = useMemo(() => {
    return Object.entries(inputSchema.properties ?? {});
  }, [inputSchema]);

  const handleClick = () => {
    const failSchema = inputSchemaIterator.find(([key]) => {
      if (inputSchema.required?.includes(key) && inputs[key] === undefined)
        return true;
    });
    if (failSchema) {
      return toast.warning(`${failSchema[0]} is Empty`);
    }

    const validateResult = allNodeValidate({
      nodes,
      edges: getEdges(),
    });

    if (validateResult !== true) {
      if (validateResult.node) {
        updateNode(validateResult.node.id, { selected: true });
      }
      return toast.warning(validateResult.errorMessage);
    }
    onRun(inputs);
  };

  return (
    <div className="fade-300 w-sm h-[85vh] space-y-4 bg-card border rounded-lg shadow-lg overflow-y-auto py-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2 w-full h-9">
          <span className="font-semibold">Run</span>
          <div
            className="p-1 rounded hover:bg-secondary cursor-pointer ml-auto"
            onClick={close}
          >
            <XIcon className="size-3.5" />
          </div>
        </div>
      </div>
      <Separator className="my-6" />
      <div className="px-4 flex flex-col gap-4">
        {inputSchemaIterator.length == 0 ? (
          <div className="flex items-center justify-center h-40">
            <FlipWords
              className="text-sm text-muted-foreground"
              words={["No input required for this workflow"]}
            />
          </div>
        ) : (
          inputSchemaIterator.map(([key, schema], i) => {
            return (
              <div key={key ?? i}>
                <Label
                  className="mb-2 text-sm font-semibold ml-0.5 gap-0.5"
                  htmlFor={key || String(i)}
                >
                  {key || "undefined"}
                  {inputSchema.required?.includes(key) && (
                    <span className="text-xs text-destructive">*</span>
                  )}
                </Label>

                {schema.type == "number" ? (
                  <Input
                    id={key || String(i)}
                    type="number"
                    placeholder={schema.description || "number"}
                    value={inputs[key]}
                    onChange={(e) =>
                      setInputs({ ...inputs, [key]: e.target.value })
                    }
                  />
                ) : schema.type == "boolean" ? (
                  <Switch
                    id={key || String(i)}
                    checked={inputs[key]}
                    onCheckedChange={(checked) =>
                      setInputs({ ...inputs, [key]: checked })
                    }
                  />
                ) : schema.type == "string" && schema.enum ? (
                  <Select
                    defaultValue={inputs[key]}
                    onValueChange={(value) =>
                      setInputs({ ...inputs, [key]: value })
                    }
                  >
                    <SelectTrigger id={key || String(i)} className="min-w-46">
                      <SelectValue
                        placeholder={schema.description || "option"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(schema.enum as string[]).map((item, i) => (
                        <SelectItem key={item ?? i} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : schema.type == "string" ? (
                  <Textarea
                    id={key || String(i)}
                    value={inputs[key]}
                    className="resize-none max-h-28 overflow-y-auto"
                    placeholder={schema.description || "string"}
                    onChange={(e) =>
                      setInputs({ ...inputs, [key]: e.target.value })
                    }
                  />
                ) : null}
              </div>
            );
          })
        )}
        <Button
          disabled={isProcessing}
          className="font-bold w-full"
          onClick={handleClick}
        >
          {isProcessing ? (
            <Loader className="size-3.5 animate-spin" />
          ) : (
            "Run Workflow"
          )}
        </Button>
      </div>
    </div>
  );
}

function NodeDetailPanel({ node }: { node: UINode }) {
  const { updateNodeData, updateNode } = useReactFlow();

  return (
    <div
      key={node.id}
      className="w-sm h-[85vh] space-y-4 bg-card border rounded-lg shadow-lg overflow-y-auto py-4"
    >
      {/* Header */}
      <div className="px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 w-full">
            <NodeIcon type={node.data.kind} />
            <Input
              maxLength={20}
              onChange={(e) =>
                updateNodeData(node.id, { name: e.target.value })
              }
              value={node.data.name}
              className="bg-transparent border-none px-0 text-lg font-semibold"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="ml-auto rounded hover:bg-secondary cursor-pointer p-1">
                  <MoreHorizontalIcon className="size-3.5" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <NodeContextMenuContent node={node.data} />
              </DropdownMenuContent>
            </DropdownMenu>
            <div
              className="p-1 rounded hover:bg-secondary cursor-pointer"
              onClick={() => {
                updateNode(node.id, { selected: false });
              }}
            >
              <XIcon className="size-3.5" />
            </div>
          </div>
        </div>
        {node.data.kind !== NodeKind.Information && (
          <Textarea
            className="text-xs bg-transparent rounded-none resize-none overflow-y-auto max-h-14 min-h-6 h-6 mt-2 p-0 border-none"
            value={node.data.description}
            onChange={(e) =>
              updateNodeData(node.id, {
                description: e.target.value,
              })
            }
            placeholder="node description..."
          />
        )}
      </div>

      <Separator className="my-6" />
      <div className="flex-1">
        {node.data.runtime?.isRunTab ? (
          <NodeRun />
        ) : node.data.kind === NodeKind.Start ? (
          <StartNodeDataConfig data={node.data} />
        ) : node.data.kind === NodeKind.End ? (
          <EndNodeDataConfig data={node.data} />
        ) : node.data.kind === NodeKind.LLM ? (
          <LLMNodeDataConfig data={node.data} />
        ) : node.data.kind === NodeKind.Condition ? (
          <ConditionNodeDataConfig data={node.data} />
        ) : node.data.kind === NodeKind.Information ? (
          <div className="h-full flex flex-col gap-2 px-4">
            <Label className="text-muted-foreground text-xs">Description</Label>
            <Textarea
              className="resize-none min-h-80 max-h-80 overflow-y-auto"
              value={node.data.description}
              onChange={(e) =>
                updateNodeData(node.id, {
                  description: e.target.value,
                })
              }
            />
          </div>
        ) : null}
      </div>

      {![NodeKind.End].includes(node.data.kind) && (
        <>
          <Separator className="my-6" />
          <div className="px-4 ">
            <NextNodeInfo
              node={node}
              onSelectNode={(id) => {
                updateNode(node.id, { selected: false });
                nextTick().then(() => updateNode(id, { selected: true }));
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
