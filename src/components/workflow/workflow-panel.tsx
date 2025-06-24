"use client";

import { memo, useState } from "react";

import { Separator } from "@/components/ui/separator";

import { UINode } from "lib/ai/workflow/workflow.interface";

import { Loader, LockIcon, PlayIcon } from "lucide-react";
import { Button } from "ui/button";

import equal from "fast-deep-equal";

import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { DBWorkflow } from "app-types/workflow";

import { SelectedNodeConfigTab } from "./selected-node-config-tab";
import { ExecuteTab } from "./node-config/execute-tab";
import { useReactFlow } from "@xyflow/react";

export const WorkflowPanel = memo(
  function WorkflowPanel({
    selectedNode,
    isProcessing,
    onSave,

    workflow,
  }: {
    selectedNode?: UINode;
    onSave: () => void;
    isProcessing: boolean;
    workflow: DBWorkflow;
  }) {
    const { setNodes } = useReactFlow();
    const [showExecutePanel, setShowExecutePanel] = useState(false);

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
            onClick={() => {
              setNodes((nds) => {
                return nds.map((node) => {
                  if (node.selected) {
                    return { ...node, selected: false };
                  }
                  return node;
                });
              });
              setShowExecutePanel(!showExecutePanel);
            }}
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
          {selectedNode && <SelectedNodeConfigTab node={selectedNode} />}
          {showExecutePanel && (
            <ExecuteTab
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
