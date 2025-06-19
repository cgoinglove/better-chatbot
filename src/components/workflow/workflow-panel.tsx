"use client";

import { memo, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Separator } from "@/components/ui/separator";

import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { NodeIcon } from "./node-icon";
import { nextTick } from "lib/utils";
import {
  Loader,
  LockIcon,
  MoreHorizontalIcon,
  PlayIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "ui/button";
import { StartNodeConfig } from "./start-node-config";
import { EndNodeConfig } from "./end-node-config";
import { Label } from "ui/label";
import { Edge, useReactFlow } from "@xyflow/react";
import { NodeRun } from "./node-run";
import { LLMNodeConfig } from "./llm-node-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { NodeContextMenuContent } from "./node-context-menu-content";
import { NextNodeInfo } from "./next-node-info";

export const WorkflowPanel = memo(function WorkflowPanel({
  nodes,
  edges,
  isProcessing,
  onSave,
}: {
  nodes: UINode[];
  edges: Edge[];
  onSave: () => void;
  isProcessing: boolean;
}) {
  const { updateNode, setEdges } = useReactFlow<UINode>();

  const selectedNode = useMemo(() => {
    return nodes.find((node) => node.selected);
  }, [nodes]);

  const unLink = useCallback((source: string, target: string) => {
    setEdges((edges) => {
      const edge = edges.find((e) => e.source == source && e.target == target);
      if (!edge) return edges;
      return edges.filter((e) => e != edge);
    });
  }, []);

  return (
    <div className="min-h-0 h-[90vh] flex flex-col items-end">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="secondary" size="icon">
          <LockIcon />
        </Button>
        <div className="h-6">
          <Separator orientation="vertical" />
        </div>
        <Button variant="secondary">
          <PlayIcon />
          Execute
        </Button>
        <div className="h-6">
          <Separator orientation="vertical" />
        </div>
        <Button disabled={isProcessing} onClick={onSave} variant="default">
          Save
          {isProcessing && <Loader className="size-3.5 animate-spin" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      </div>
      {selectedNode && (
        <div
          key={selectedNode.id}
          className="w-sm h-full space-y-4 bg-card border rounded-lg shadow-lg overflow-y-auto py-4"
        >
          {/* Header */}
          <div className="px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 w-full">
                <NodeIcon type={selectedNode.data.kind} />
                <Input
                  maxLength={20}
                  onChange={(e) =>
                    updateNode(selectedNode.id, (prev) => ({
                      data: {
                        ...prev.data,
                        name: e.target.value,
                      },
                    }))
                  }
                  value={selectedNode.data.name}
                  className="bg-transparent border-none px-0 text-lg font-semibold"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="ml-auto rounded hover:bg-secondary cursor-pointer p-1">
                      <MoreHorizontalIcon className="size-3.5" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <NodeContextMenuContent node={selectedNode.data} />
                  </DropdownMenuContent>
                </DropdownMenu>
                <div
                  className="p-1 rounded hover:bg-secondary cursor-pointer"
                  onClick={() => {
                    updateNode(selectedNode.id, { selected: false });
                  }}
                >
                  <XIcon className="size-3.5" />
                </div>
              </div>
            </div>
            {selectedNode.data.kind !== NodeKind.Information && (
              <Textarea
                className="text-xs bg-transparent rounded-none resize-none overflow-y-auto max-h-14 min-h-6 h-6 mt-2 p-0 border-none"
                value={selectedNode.data.description}
                onChange={(e) =>
                  updateNode(selectedNode.id, (prev) => ({
                    data: { ...prev.data, description: e.target.value },
                  }))
                }
                placeholder="node description..."
              />
            )}
          </div>

          <Separator className="my-6" />
          <div className="px-4">
            {selectedNode.data.isRunTab ? (
              <NodeRun />
            ) : selectedNode.data.kind === NodeKind.Start ? (
              <StartNodeConfig
                node={selectedNode as UINode<NodeKind.Start>}
                setNode={(partial) => updateNode(selectedNode.data.id, partial)}
              />
            ) : selectedNode.data.kind === NodeKind.End ? (
              <EndNodeConfig
                node={selectedNode as UINode<NodeKind.End>}
                nodes={nodes}
                edges={edges}
                setNode={(partial) => updateNode(selectedNode.data.id, partial)}
              />
            ) : selectedNode.data.kind === NodeKind.LLM ? (
              <LLMNodeConfig
                node={selectedNode as UINode<NodeKind.LLM>}
                nodes={nodes}
                edges={edges}
                setNode={(partial) => updateNode(selectedNode.data.id, partial)}
              />
            ) : selectedNode.data.kind === NodeKind.Information ? (
              <div className="h-full flex flex-col gap-2">
                <Label className="text-muted-foreground text-xs">
                  Description
                </Label>
                <Textarea
                  className="resize-none min-h-80 max-h-80 overflow-y-auto"
                  value={selectedNode.data.description}
                  onChange={(e) =>
                    updateNode(selectedNode.data.id, (prev) => ({
                      data: {
                        ...prev.data,
                        description: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            ) : null}
          </div>
          <Separator className="my-6" />
          {selectedNode.data.kind !== NodeKind.End && (
            <div className="px-4 mt-auto flex-1 h-full">
              <NextNodeInfo
                edges={edges}
                nodes={nodes}
                node={selectedNode}
                onSelectNode={(id) => {
                  updateNode(selectedNode.id, { selected: false });
                  nextTick().then(() => updateNode(id, { selected: true }));
                }}
                onDisconnected={(id) => unLink(selectedNode.data.id, id)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});
