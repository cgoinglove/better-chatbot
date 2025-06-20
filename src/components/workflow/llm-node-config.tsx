import { Edge } from "@xyflow/react";
import { LLMNode, UINode } from "lib/ai/workflow/interface";

import { NodeKind } from "lib/ai/workflow/interface";
import { SelectModel } from "../select-model";
import { Button } from "ui/button";
import {
  ChevronDown,
  MessageCirclePlusIcon,
  TrashIcon,
  VariableIcon,
} from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "ui/select";
import { OutputSchemaMentionInput } from "./output-schema-mention-input";
import { Label } from "ui/label";
import { Separator } from "ui/separator";

export function LLMNodeConfig({
  node,
  nodes,
  edges,
  setNode,
}: {
  node: UINode<NodeKind.LLM>;
  nodes: UINode[];
  edges: Edge[];
  setNode: (node: Mutate<UINode>) => void;
}) {
  const model = node.data.model;

  const updateMessage = (
    index: number,
    message: LLMNode["messages"][number],
  ) => {
    setNode((prev) => ({
      data: {
        ...prev.data,
        messages: (prev.data as LLMNode).messages.map((m, i) =>
          i === index ? message : m,
        ),
      },
    }));
  };

  const removeMessage = (index: number) => {
    setNode((prev) => ({
      data: {
        ...prev.data,
        messages: (prev.data as LLMNode).messages.filter((_, i) => i !== index),
      },
    }));
  };

  const addMessage = () => {
    setNode((prev) => ({
      data: {
        ...prev.data,
        messages: [...(prev.data as LLMNode).messages, { role: "assistant" }],
      },
    }));
  };

  return (
    <div className="flex flex-col gap-2 text-sm h-full ">
      <Label className="text-sm text-muted-foreground">Model</Label>
      <SelectModel
        defaultModel={model}
        onSelect={(model) => {
          setNode((prev) => ({
            data: { ...prev.data, model },
          }));
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
        {Object.keys(node.data.outputSchema.properties).map((key) => {
          return (
            <div key={key} className="flex items-center text-xs">
              <VariableIcon className="size-3.5 text-blue-500" />
              <span className="font-semibold">{key}</span>
              <span className="text-muted-foreground ml-2">
                {node.data.outputSchema.properties[key].type}
              </span>
            </div>
          );
        })}
      </div>
      <Separator className="my-4" />
      <Label className="text-sm mt-1 text-muted-foreground">Messages</Label>
      <div className="flex flex-col gap-2">
        {node.data.messages.map((message, index) => {
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
                currentNodeId={node.data.id}
                nodes={nodes}
                edges={edges}
                content={message.content}
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
}

export function LLMNodeStack({ data }: { data: LLMNode }) {
  if (!data.model) return null;
  return (
    <div className="flex flex-col gap-1 px-4 mt-4">
      <div className="border bg-input text-[10px] rounded px-2 py-1 flex items-center gap-1">
        <span className="font-semibold">{data.model.model}</span>
      </div>
    </div>
  );
}
