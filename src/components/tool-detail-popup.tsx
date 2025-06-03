"use client";
import { MCPToolInfo } from "app-types/mcp";
import { PropsWithChildren, useState } from "react";
import { useToolCustomization } from "@/hooks/use-tool-customizations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Separator } from "ui/separator";
import JsonView from "ui/json-view";
import { Textarea } from "ui/textarea";
import { Button } from "ui/button";
import { Pencil, Trash2, Check } from "lucide-react";
import { safe } from "ts-safe";
import { handleErrorWithToast } from "ui/shared-toast";

// Helper function to check if schema is empty
const isEmptySchema = (schema: any): boolean => {
  if (!schema) return true;
  // Check properties first if available, otherwise check the schema itself
  const dataToCheck = schema.properties || schema;
  return Object.keys(dataToCheck).length === 0;
};

export const ToolDetailPopup = ({
  tool,
  children,
  serverName,
}: PropsWithChildren<{ tool: MCPToolInfo; serverName: string }>) => {
  const { customization, isLoading, save, remove, mutate } =
    useToolCustomization(tool.name, serverName);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(customization?.customPrompt ?? "");

  const startEdit = (e: any) => {
    e.stopPropagation();
    setValue(customization?.customPrompt ?? "");
    setEditing(true);
  };

  const handleSave = () => {
    safe(() => save(value))
      .ifOk(() => mutate())
      .ifFail(handleErrorWithToast)
      .watch(() => setEditing(false));
  };

  const handleDelete = () => {
    safe(() => remove())
      .ifOk(() => mutate())
      .ifFail(handleErrorWithToast)
      .watch(() => setEditing(false));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <DialogContent className="sm:max-w-[800px] fixed p-10 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{tool.name}</DialogTitle>
          </DialogHeader>
          <div className="mb-2">
            <p
              aria-describedby="tool-description"
              className="text-xs text-muted-foreground mt-1 max-h-[150px] overflow-y-auto"
            >
              {tool.description}
            </p>
          </div>

          {/* Additional Instructions section */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="text-xs font-medium flex-1">
                Additional instructions
              </h5>
              {!editing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startEdit}
                  aria-label="Edit instructions"
                >
                  <span className="sr-only">Edit</span>
                  <Pencil className="size-3" />
                </Button>
              )}
            </div>

            {isLoading ? (
              <p className="text-xs text-muted-foreground italic">Loading...</p>
            ) : editing ? (
              <div className="space-y-2">
                <Textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Check className="size-3 mr-1" /> Save
                  </Button>
                  {customization?.customPrompt && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="size-3 mr-1" /> Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : customization?.customPrompt ? (
              <p className="text-xs whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto">
                {customization.customPrompt}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">None</p>
            )}
          </div>

          <Separator className="my-2" />

          <div className="flex items-center gap-2 mb-2">
            <h5 className="text-xs font-medium">Input Schema</h5>
          </div>
          {tool.inputSchema ? (
            <div className="overflow-y-auto max-h-[40vh]">
              {!isEmptySchema(tool.inputSchema) ? (
                <JsonView
                  data={tool.inputSchema?.properties || tool.inputSchema}
                />
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No data available
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No schema available
            </p>
          )}

          <div className="absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
