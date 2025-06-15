import { Edge } from "@xyflow/react";
import { LLMNode, UINode } from "lib/ai/workflow/interface";

import { NodeKind } from "lib/ai/workflow/interface";
import { SelectModel } from "../select-model";
import { Button } from "ui/button";
import { ChevronDown, MessageCirclePlusIcon, TrashIcon } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "ui/select";
import { OutputSchemaMentionInput } from "./output-schema-mention-input";

export function LLMNodeConfig({
  node,
  nodes,
  edges,
  setNode,
}: {
  node: UINode<NodeKind.LLM>;
  nodes: UINode[];
  edges: Edge[];
  setNode: (node: Mutate<UINode<NodeKind.LLM>>) => void;
}) {
  const model = node.data.model;

  const updateMessage = (
    index: number,
    message: LLMNode["messages"][number],
  ) => {
    setNode((prev) => ({
      data: {
        ...prev.data,
        messages: prev.data.messages.map((m, i) => (i === index ? message : m)),
      },
    }));
  };

  const removeMessage = (index: number) => {
    setNode((prev) => ({
      data: {
        ...prev.data,
        messages: prev.data.messages.filter((_, i) => i !== index),
      },
    }));
  };

  const addMessage = () => {
    setNode((prev) => ({
      data: {
        ...prev.data,
        messages: [
          ...prev.data.messages,
          { role: "assistant", content: { type: "text", text: "" } },
        ],
      },
    }));
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div>Model</div>
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

      <div className="flex flex-col gap-2">
        {node.data.messages.map((message, index) => {
          return (
            <div key={index} className="w-full bg-secondary rounded-md p-2">
              <div className="flex items-center gap-2">
                <Select
                  defaultValue={message.role}
                  onValueChange={(value) => {
                    updateMessage(index, {
                      ...message,
                      role: value as "user" | "assistant" | "system",
                    });
                  }}
                >
                  <SelectTrigger className="border-none">
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
                  className="ml-auto size-7 hover:bg-destructive/10"
                  onClick={() => removeMessage(index)}
                >
                  <TrashIcon className="size-3 hover:text-destructive" />
                </Button>
              </div>
              <OutputSchemaMentionInput
                currentNodeId={node.data.id}
                nodes={nodes}
                edges={edges}
                input={message.content.text}
                onChange={(input) => {
                  console.log(input);
                  //   updateMessage(index, {
                  //     ...message,
                  //     content: { type: "text", text: input },
                  //   });
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
