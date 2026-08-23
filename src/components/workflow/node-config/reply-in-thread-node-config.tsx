import { memo, useCallback } from "react";
import { Edge, useEdges, useNodes, useReactFlow } from "@xyflow/react";
import { MessageCirclePlusIcon, TrashIcon } from "lucide-react";
import { Button } from "ui/button";
import { Label } from "ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useWorkflowStore } from "@/app/store/workflow.store";
import { OutputSchemaMentionInput } from "../output-schema-mention-input";
import {
  ReplyInThreadNodeData,
  UINode,
} from "lib/ai/workflow/workflow.interface";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { VariableIcon } from "lucide-react";

export const ReplyInThreadNodeConfig = memo(function ReplyInThreadNodeConfig({
  data,
}: {
  data: ReplyInThreadNodeData;
}) {
  const t = useTranslations();
  const { updateNodeData } = useReactFlow<UINode>();
  const nodes = useNodes() as UINode[];
  const edges = useEdges() as Edge[];
  const editable = useWorkflowStore((state) => {
    return (
      state.processIds.length === 0 &&
      state.hasEditAccess &&
      !state.workflow?.isPublished
    );
  });

  const updateMessage = useCallback(
    (
      index: number,
      message: Partial<ReplyInThreadNodeData["messages"][number]>,
    ) => {
      updateNodeData(data.id, (node) => {
        const prev = node.data as ReplyInThreadNodeData;
        return {
          messages: prev.messages.map((m, i) => {
            if (i !== index) return m;
            return { ...m, ...message };
          }),
        };
      });
    },
    [data.id, updateNodeData],
  );

  const removeMessage = useCallback(
    (index: number) => {
      updateNodeData(data.id, (node) => {
        const prev = node.data as ReplyInThreadNodeData;
        return {
          messages: prev.messages.filter((_, i) => i !== index),
        };
      });
    },
    [data.id, updateNodeData],
  );

  const addMessage = useCallback(() => {
    updateNodeData(data.id, (node) => {
      const prev = node.data as ReplyInThreadNodeData;
      return {
        messages: [...prev.messages, { role: "user" }],
      };
    });
  }, [data.id, updateNodeData]);

  const messageHelper = useMemo(() => {
    return (
      t("Workflow.messagesDescription") ||
      "Use '/' to reference data from previous nodes."
    );
  }, [t]);

  return (
    <div className="flex flex-col gap-4 h-full px-4">
      <div className="flex flex-col gap-2">
        <Label className="text-sm">Thread Title</Label>
        <OutputSchemaMentionInput
          currentNodeId={data.id}
          nodes={nodes}
          edges={edges}
          content={data.title}
          editable={editable}
          onChange={(title) =>
            updateNodeData(data.id, {
              title,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Messages</Label>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <VariableIcon className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64 whitespace-pre-wrap">
              {messageHelper}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-col gap-2">
          {data.messages.map((message, index) => (
            <div key={index} className="w-full bg-secondary rounded-md p-2">
              <div className="flex items-center gap-2">
                <Select
                  value={message.role}
                  onValueChange={(value) =>
                    updateMessage(index, {
                      role: value as ReplyInThreadNodeData["messages"][number]["role"],
                    })
                  }
                >
                  <SelectTrigger className="border-none" size="sm">
                    {message.role.toUpperCase()}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">USER</SelectItem>
                    <SelectItem value="assistant">ASSISTANT</SelectItem>
                    <SelectItem value="system">SYSTEM</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-7 hover:bg-destructive/10! hover:text-destructive"
                  onClick={() => removeMessage(index)}
                  disabled={!editable}
                >
                  <TrashIcon className="size-3" />
                </Button>
              </div>
              <OutputSchemaMentionInput
                currentNodeId={data.id}
                nodes={nodes}
                edges={edges}
                content={message.content}
                editable={editable}
                onChange={(content) => updateMessage(index, { content })}
              />
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-full mt-1 border-dashed border text-muted-foreground"
          onClick={addMessage}
          disabled={!editable}
        >
          <MessageCirclePlusIcon className="size-4" />{" "}
          {t("Workflow.addMessage")}
        </Button>
      </div>
    </div>
  );
});
ReplyInThreadNodeConfig.displayName = "ReplyInThreadNodeConfig";

export const ReplyInThreadNodeStack = memo(function ReplyInThreadNodeStack({
  data,
}: {
  data: ReplyInThreadNodeData;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 mt-4 text-xs text-muted-foreground">
      <div className="border bg-input rounded px-2 py-1 flex items-center gap-2">
        <span className="font-semibold">Messages</span>
        <span className="ml-auto text-foreground font-mono">
          {data.messages.length}
        </span>
      </div>
    </div>
  );
});
ReplyInThreadNodeStack.displayName = "ReplyInThreadNodeStack";
