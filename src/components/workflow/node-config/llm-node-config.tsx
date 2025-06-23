import { LLMNodeData, UINode } from "lib/ai/workflow/workflow.interface";

import { SelectModel } from "../../select-model";
import { Button } from "ui/button";
import {
  ChevronDown,
  MessageCirclePlusIcon,
  TrashIcon,
  VariableIcon,
} from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "ui/select";
import { OutputSchemaMentionInput } from "../output-schema-mention-input";
import { Label } from "ui/label";
import { Separator } from "ui/separator";
import { memo, useCallback, useEffect, useMemo } from "react";
import { appStore } from "@/app/store";
import { Edge, useEdges, useNodes, useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/app/store/workflow.store";

export const LLMNodeDataConfig = memo(function ({
  data,
}: {
  data: LLMNodeData;
}) {
  const { updateNodeData } = useReactFlow();
  const isProcessing = useWorkflowStore((state) => state.processIds.length > 0);
  const nodes = useNodes() as UINode[];
  const edges = useEdges() as Edge[];

  const model = useMemo(() => {
    return data.model || appStore.getState().chatModel!;
  }, [data.model]);

  const updateMessage = useCallback(
    (index: number, message: LLMNodeData["messages"][number]) => {
      updateNodeData(data.id, (node) => {
        const prev = node.data as LLMNodeData;
        return {
          messages: prev.messages.map((m, i) => (i === index ? message : m)),
        };
      });
    },
    [data.id],
  );

  const removeMessage = useCallback(
    (index: number) => {
      updateNodeData(data.id, (node) => {
        const prev = node.data as LLMNodeData;
        return {
          messages: prev.messages.filter((_, i) => i !== index),
        };
      });
    },
    [data.id],
  );

  const addMessage = useCallback(() => {
    updateNodeData(data.id, (node) => {
      const prev = node.data as LLMNodeData;
      return {
        messages: [...prev.messages, { role: "assistant" }],
      };
    });
  }, [data.id]);

  useEffect(() => {
    if (!data.model) {
      updateNodeData(data.id, {
        model: appStore.getState().chatModel!,
      });
    }
  }, []);

  return (
    <div className="flex flex-col gap-2 text-sm h-full px-4 ">
      <Label className="text-sm text-muted-foreground">Model</Label>
      <SelectModel
        defaultModel={model}
        onSelect={(model) => {
          updateNodeData(data.id, {
            model,
          });
        }}
      >
        <Button
          variant={"outline"}
          className="data-[state=open]:bg-input! hover:bg-input! w-full "
        >
          <p className="mr-auto">
            {model?.model ?? (
              <span className="text-muted-foreground">model</span>
            )}
          </p>
          <ChevronDown className="size-3" />
        </Button>
      </SelectModel>
      <Label className="text-sm mt-1 text-muted-foreground">
        LLM Response Schema
      </Label>
      <div className="flex items-center gap-2 bg-secondary rounded-md p-2">
        {Object.keys(data.outputSchema.properties).map((key) => {
          return (
            <div key={key} className="flex items-center text-xs">
              <VariableIcon className="size-3.5 text-blue-500" />
              <span className="font-semibold">{key}</span>
              <span className="text-muted-foreground ml-2">
                {data.outputSchema.properties[key].type}
              </span>
            </div>
          );
        })}
      </div>
      <Separator className="my-4" />
      <Label className="text-sm mt-1 text-muted-foreground">Messages</Label>
      <div className="flex flex-col gap-2">
        {data.messages.map((message, index) => {
          return (
            <div key={index} className="w-full bg-secondary rounded-md p-2">
              <div className="flex items-center gap-2">
                <Select
                  value={message.role}
                  onValueChange={(value) => {
                    updateMessage(index, {
                      ...message,
                      role: value as "user" | "assistant" | "system",
                    });
                  }}
                >
                  <SelectTrigger className="border-none" size={"sm"}>
                    {message.role.toUpperCase()}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">USER</SelectItem>
                    <SelectItem value="assistant">ASSISTANT</SelectItem>
                    <SelectItem value="system">SYSTEM</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  className="ml-auto size-7 hover:bg-destructive/10! hover:text-destructive"
                  onClick={() => removeMessage(index)}
                >
                  <TrashIcon className="size-3 hover:text-destructive" />
                </Button>
              </div>
              <OutputSchemaMentionInput
                currentNodeId={data.id}
                nodes={nodes}
                edges={edges}
                content={message.content}
                editable={!isProcessing}
                onChange={(content) => {
                  updateMessage(index, {
                    ...message,
                    content,
                  });
                }}
              />
            </div>
          );
        })}

        <Button
          variant={"ghost"}
          size={"icon"}
          className="w-full mt-1 border-dashed border text-muted-foreground"
          onClick={addMessage}
        >
          <MessageCirclePlusIcon className="size-4" /> Add Message
        </Button>
      </div>
    </div>
  );
});
LLMNodeDataConfig.displayName = "LLMNodeDataConfig";

export const LLMNodeDataStack = memo(function ({
  data,
}: { data: LLMNodeData }) {
  if (!data.model) return null;
  return (
    <div className="flex flex-col gap-1 px-4 mt-4">
      <div className="border bg-input text-[10px] rounded px-2 py-1 flex items-center gap-1">
        <span className="font-semibold">{data.model.model}</span>
      </div>
    </div>
  );
});
LLMNodeDataStack.displayName = "LLMNodeDataStack";
