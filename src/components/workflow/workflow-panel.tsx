"use client";

import { memo, useCallback, useState } from "react";

import { Separator } from "@/components/ui/separator";

import { UINode } from "lib/ai/workflow/workflow.interface";

import {
  BlocksIcon,
  Check,
  EyeIcon,
  Loader,
  LockIcon,
  PlayIcon,
  AlignHorizontalSpaceAround,
} from "lucide-react";
import { Button } from "ui/button";

import equal from "lib/equal";

import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { DBWorkflow } from "app-types/workflow";

import { SelectedNodeConfigTab } from "./selected-node-config-tab";
import { ExecuteTab } from "./node-config/execute-tab";
import { useReactFlow } from "@xyflow/react";
import { safe } from "ts-safe";
import { handleErrorWithToast } from "ui/shared-toast";
import { mutate } from "swr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { allNodeValidate } from "lib/ai/workflow/node-validate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { arrangeNodes } from "lib/ai/workflow/arrange-nodes";

export const WorkflowPanel = memo(
  function WorkflowPanel({
    selectedNode,
    isProcessing,
    onSave,
    workflow,
    addProcess,
    hasEditAccess,
  }: {
    selectedNode?: UINode;
    onSave: () => Promise<void>;
    isProcessing: boolean;
    workflow: DBWorkflow;
    addProcess: () => () => void;
    hasEditAccess?: boolean;
  }) {
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const [showExecutePanel, setShowExecutePanel] = useState(false);
    const t = useTranslations();

    const handleArrangeNodes = useCallback(() => {
      const nodes = getNodes() as UINode[];
      const edges = getEdges();

      const { nodes: arrangedNodes } = arrangeNodes(nodes, edges);

      setNodes(arrangedNodes);
      toast.success(t("Workflow.nodesArranged"));
    }, [getNodes, getEdges, setNodes, t]);
    const updateVisibility = useCallback(
      (visibility: DBWorkflow["visibility"]) => {
        const close = addProcess();
        safe(() =>
          fetch("/api/workflow", {
            method: "POST",
            body: JSON.stringify({
              ...workflow,
              visibility,
            }),
          }).then((res) => {
            if (res.status != 200) throw new Error(res.statusText);
          }),
        )
          .ifOk(() => mutate(`/api/workflow/${workflow.id}`))
          .ifFail((e) => handleErrorWithToast(e))
          .watch(close);
      },
      [workflow],
    );

    const updatePublished = useCallback(
      (isPublished: boolean) => {
        if (isPublished) {
          const validateResult = allNodeValidate({
            nodes: getNodes() as UINode[],
            edges: getEdges(),
          });

          if (validateResult !== true) {
            if (validateResult.node) {
              setNodes((nds) => {
                return nds.map((node) => {
                  if (node.id === validateResult.node?.id) {
                    return { ...node, selected: true };
                  }
                  if (node.selected) {
                    return { ...node, selected: false };
                  }
                  return node;
                });
              });
            }
            return toast.warning(validateResult.errorMessage);
          }
        }

        const close = addProcess();
        safe(() => onSave())
          .ifOk(() =>
            fetch("/api/workflow", {
              method: "POST",
              body: JSON.stringify({
                ...workflow,
                isPublished,
              }),
            }).then((res) => {
              if (res.status != 200) throw new Error(res.statusText);
            }),
          )
          .ifOk(() => mutate(`/api/workflow/${workflow.id}`))
          .ifFail((e) => handleErrorWithToast(e))
          .watch(close);
      },
      [workflow],
    );

    return (
      <div className="min-h-0 flex flex-col items-end">
        <div className="flex items-center gap-2 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                style={{
                  backgroundColor: workflow.icon?.style?.backgroundColor,
                }}
                className="border transition-colors hover:bg-secondary! group items-center justify-center flex w-8 h-8 rounded-md ring ring-background hover:ring-ring"
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                disabled={isProcessing || !hasEditAccess}
                onClick={handleArrangeNodes}
              >
                <AlignHorizontalSpaceAround className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("Workflow.arrangeNodes")}</p>
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
            {t("Common.run")}
          </Button>

          {!workflow.isPublished && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={isProcessing || !hasEditAccess}
                  onClick={onSave}
                  variant="default"
                >
                  {isProcessing ? (
                    <Loader className="size-3.5 animate-spin" />
                  ) : (
                    t("Common.save")
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t("Workflow.autoSaveDescription")}
              </TooltipContent>
            </Tooltip>
          )}
          <div className="h-6">
            <Separator orientation="vertical" />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"secondary"}
                disabled={isProcessing || !hasEditAccess}
                onClick={() => updatePublished(!workflow.isPublished)}
                className="w-20"
              >
                {workflow.isPublished
                  ? t("Common.edit")
                  : t("Workflow.publish")}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="w-60 text-sm">
              <p className="whitespace-pre-wrap break-words p-4">
                {workflow.isPublished
                  ? t("Workflow.publishedDescription")
                  : t("Workflow.draftDescription")}
              </p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="data-[state=open]:bg-input!"
                  >
                    {workflow.visibility == "public" ? (
                      <BlocksIcon />
                    ) : workflow.visibility == "readonly" ? (
                      <EyeIcon />
                    ) : (
                      <LockIcon />
                    )}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t("Workflow.visibilityDescription")}
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent side="bottom" align="end">
              {[
                {
                  icon: <LockIcon />,
                  value: "private",
                  label: "Workflow.private",
                  description: "Workflow.privateDescription",
                },
                {
                  icon: <EyeIcon />,
                  value: "readonly",
                  label: "Workflow.readonly",
                  description: "Workflow.readonlyDescription",
                },
                {
                  icon: <BlocksIcon />,
                  value: "public",
                  label: "Workflow.public",
                  description: "Workflow.publicDescription",
                },
              ].map((item) => {
                return (
                  <DropdownMenuItem
                    disabled={
                      workflow.visibility == item.value || !hasEditAccess
                    }
                    key={item.value}
                    className="cursor-pointer"
                    onClick={() =>
                      updateVisibility(item.value as DBWorkflow["visibility"])
                    }
                  >
                    {item.icon}
                    <div className="flex flex-col px-4 gap-1">
                      <p>{t(item.label)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(item.description)}
                      </p>
                    </div>
                    {workflow.visibility == item.value && (
                      <Check className="ml-auto" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2">
          {selectedNode && <SelectedNodeConfigTab node={selectedNode} />}
          {showExecutePanel && (
            <ExecuteTab
              close={() => {
                if (isProcessing) return;
                setShowExecutePanel(false);
              }}
              onSave={onSave}
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
    if (prev.hasEditAccess !== next.hasEditAccess) {
      return false;
    }
    if (!equal(prev.selectedNode?.data, next.selectedNode?.data)) {
      return false;
    }

    if (!equal(prev.workflow, next.workflow)) return false;
    return true;
  },
);
