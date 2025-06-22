"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Separator } from "@/components/ui/separator";

import { NodeKind, UINode } from "lib/ai/workflow/workflow.interface";
import { NodeIcon } from "./node-icon";
import { nextTick } from "lib/utils";
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
import { useReactFlow } from "@xyflow/react";
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

export const WorkflowPanel = memo(function WorkflowPanel({
  selectedNode,
  isProcessing,
  onSave,
}: {
  selectedNode?: UINode;
  onSave: () => void;
  isProcessing: boolean;
}) {
  return (
    <div className="min-h-0 flex flex-col items-end">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="secondary">
          <PlayIcon />
          Execute
        </Button>
        <div className="h-6">
          <Separator orientation="vertical" />
        </div>
        <Button
          disabled={isProcessing}
          onClick={onSave}
          variant="default"
          className="w-16"
        >
          {isProcessing ? <Loader className="size-3.5 animate-spin" /> : "Save"}
        </Button>
        <div className="h-6">
          <Separator orientation="vertical" />
        </div>
        <Button variant="secondary" size="icon" disabled>
          <LockIcon />
        </Button>
      </div>
      {selectedNode && <NodeDetailPanel node={selectedNode} />}
    </div>
  );
});

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
