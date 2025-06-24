"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Separator } from "@/components/ui/separator";

import { NodeKind, UINode } from "lib/ai/workflow/workflow.interface";
import { NodeIcon } from "./node-icon";
import { cn, createDebounce, nextTick } from "lib/utils";
import { decodeWorkflowEvents } from "lib/ai/workflow/shared.workflow";
import {
  AlertTriangle,
  Check,
  Loader,
  Loader2,
  LockIcon,
  MoreHorizontalIcon,
  PlayIcon,
  XIcon,
} from "lucide-react";
import { Button } from "ui/button";
import { StartNodeDataConfig } from "./node-config/start-node-config";
import { EndNodeDataConfig } from "./node-config/end-node-config";
import { Label } from "ui/label";
import { useReactFlow } from "@xyflow/react";
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
import { DBWorkflow } from "app-types/workflow";
import { useWorkflowStore } from "@/app/store/workflow.store";
import { TextShimmer } from "ui/text-shimmer";
import JsonView from "ui/json-view";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { GraphEndEvent } from "ts-edge";

export const WorkflowPanel = memo(
  function WorkflowPanel({
    selectedNode,
    isProcessing,
    onSave,
    addProcess,
    workflow,
  }: {
    selectedNode?: UINode;
    addProcess: () => () => void;
    onSave: () => void;
    isProcessing: boolean;
    workflow: DBWorkflow;
  }) {
    const [showExecutePanel, setShowExecutePanel] = useState(true);

    return (
      <div className="min-h-0 flex flex-col items-end">
        <div className="flex items-center gap-2 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                style={{
                  backgroundColor: workflow.icon?.style?.backgroundColor,
                }}
                className="transition-colors hover:bg-secondary! group items-center justify-center flex w-8 h-8 rounded-md ring ring-background hover:ring-ring"
              >
                <Avatar className="size-6">
                  <AvatarImage
                    src={workflow.icon?.value}
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
            disabled={isProcessing}
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
          <Button variant="secondary" size="icon" onClick={addProcess}>
            <LockIcon />
          </Button>
        </div>
        <div className="flex gap-2">
          {selectedNode && <NodeDetailPanel node={selectedNode} />}
          {showExecutePanel && (
            <ExecutePanel
              close={() => {
                if (isProcessing) return;
                setShowExecutePanel(false);
              }}
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

const debounce = createDebounce();

type NodeRuntimeHistory = {
  id: string;
  nodeId: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  kind: NodeKind;
  error?: string;
  status: "fail" | "running" | "success";
  result?: any;
};

function ExecutePanel({
  close,
}: {
  close: () => void;
}) {
  const { addProcess, processIds, workflow } = useWorkflowStore();

  const [tab, setTab] = useState("input");

  const [isRunning, setIsRunning] = useState(false);
  const [histories, setHistories] = useState<NodeRuntimeHistory[]>([]);
  const [result, setResult] = useState<GraphEndEvent | undefined>();

  const isProcessing = useMemo(
    () => Boolean(processIds.length),
    [processIds.length],
  );

  const { getEdges, getNodes, updateNode, fitView, getNode } =
    useReactFlow<UINode>();
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
    run(inputs);
  };

  const fitviewWithDebounce = useCallback((id: string) => {
    const node = getNode(id);
    if (!node) return;
    const nextNodes = getEdges()
      .filter((edge) => edge.source == id)
      .map((edge) => getNode(edge.target))
      .filter(Boolean) as UINode[];
    const fitviewNodes = [node, ...nextNodes];
    debounce(() => {
      fitView({
        duration: 300,
        nodes: fitviewNodes,
      });
    }, 300);
  }, []);

  const run = useCallback(
    async (input: Record<string, any>) => {
      const stop = addProcess();
      const abortController = new AbortController();
      setHistories([]);
      setIsRunning(true);
      try {
        const response = await fetch(`/api/workflow/${workflow!.id}/execute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No readable stream available");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const { events, remainingBuffer } = decodeWorkflowEvents(buffer);
            buffer = remainingBuffer;

            for (const event of events) {
              switch (event.eventType) {
                case "WORKFLOW_START":
                  setTab("output");
                  break;
                case "WORKFLOW_END":
                  setResult(event);
                  stop();
                  break;
                case "NODE_START": {
                  fitviewWithDebounce(event.node.name);
                  setHistories((prev) => {
                    const uiNode = getNode(event.node.name);
                    if (!uiNode) return prev;
                    return [
                      ...prev,
                      {
                        nodeId: event.node.name,
                        startedAt: Date.now(),
                        id: event.nodeExecutionId,
                        name: uiNode.data.name,
                        kind: uiNode.data.kind,
                        status: "running",
                      },
                    ];
                  });
                  break;
                }
                case "NODE_END": {
                  setHistories((prev) => {
                    const prevHistory = prev.find(
                      (h) => h.id === event.nodeExecutionId,
                    );
                    if (!prevHistory) return prev;
                    return prev.map((n) =>
                      n == prevHistory
                        ? ({
                            ...prevHistory,
                            endedAt: Date.now(),
                            status: event.isOk ? "success" : "fail",
                            error: event.error,
                            result:
                              event.node.output.outputs[prevHistory.nodeId],
                          } as NodeRuntimeHistory)
                        : n,
                    );
                  });
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          stop();
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Workflow execution was aborted");
        } else {
          console.error("Workflow execution error:", error);
        }
        stop();
      } finally {
        setIsRunning(false);
      }
    },
    [workflow!.id],
  );

  const resultView = useMemo(() => {
    if (isRunning) return;
    if (!result?.isOk)
      return (
        <Alert variant={"destructive"} className="border-destructive">
          <AlertTriangle />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            <JsonView data={result?.error} />
          </AlertDescription>
        </Alert>
      );
    const lastNode = histories.at(-1);
    if (!lastNode) return null;
    return <JsonView data={lastNode.result} />;
  }, [isRunning, result]);
  return (
    <div className="fade-300 w-sm h-[85vh] bg-card border rounded-lg shadow-lg overflow-y-auto py-4">
      <div className="flex flex-col px-4">
        <div className="flex items-center gap-2 w-full h-9">
          <span className="font-semibold">Run</span>
          <div
            className={cn(
              "p-1 rounded hover:bg-secondary cursor-pointer ml-auto",
              isProcessing && "sr-only",
            )}
            onClick={close}
          >
            <XIcon className="size-3.5" />
          </div>
        </div>
      </div>
      <div className="flex">
        <Button
          variant={tab == "input" ? "secondary" : "ghost"}
          className="rounded-none"
          onClick={() => setTab("input")}
        >
          Input
        </Button>
        <Button
          variant={tab == "output" ? "secondary" : "ghost"}
          className="rounded-none"
          onClick={() => setTab("output")}
        >
          Output
        </Button>
      </div>
      <Separator className="mb-6" />

      {tab == "input" ? (
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
                      disabled={isProcessing}
                      id={key || String(i)}
                      type="number"
                      placeholder={schema.description || "number"}
                      defaultValue={inputs[key] || undefined}
                      onChange={(e) =>
                        setInputs({ ...inputs, [key]: Number(e.target.value) })
                      }
                    />
                  ) : schema.type == "boolean" ? (
                    <Switch
                      disabled={isProcessing}
                      id={key || String(i)}
                      checked={inputs[key]}
                      onCheckedChange={(checked) =>
                        setInputs({ ...inputs, [key]: checked })
                      }
                    />
                  ) : schema.type == "string" && schema.enum ? (
                    <Select
                      disabled={isProcessing}
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
                      disabled={isProcessing}
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
      ) : (
        <div>
          <div className="flex flex-col px-4 h-96 overflow-y-auto">
            {histories.map((history, i) => {
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 text-sm rounded-sm px-2 py-1.5 ",
                    history.status != "running" &&
                      "cursor-pointer hover:bg-secondary",
                    history.status == "fail" && "text-destructive",
                  )}
                >
                  <div className="border rounded overflow-hidden">
                    <NodeIcon
                      type={history.kind}
                      iconClassName="size-3"
                      className="rounded-none"
                    />
                  </div>
                  {history.status == "running" ? (
                    <TextShimmer className="font-semibold">
                      {`${history.name} Running...`}
                    </TextShimmer>
                  ) : (
                    <span className="font-semibold">{history.name}</span>
                  )}
                  <span
                    className={cn(
                      "ml-auto text-xs",
                      history.status != "fail" && "text-muted-foreground",
                    )}
                  >
                    {history.status != "running" &&
                      ((history.endedAt! - history.startedAt!) / 1000).toFixed(
                        2,
                      )}
                  </span>
                  {history.status == "success" ? (
                    <Check className="size-3" />
                  ) : history.status == "fail" ? (
                    <XIcon className="size-3" />
                  ) : (
                    <Loader2 className="size-3 animate-spin" />
                  )}
                </div>
              );
            })}
          </div>
          <Separator />
          <div className="px-4 py-4">
            <p className="font-semibold text-sm mb-4">Result</p>
            {resultView}
          </div>
        </div>
      )}
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
        {node.data.kind === NodeKind.Start ? (
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
