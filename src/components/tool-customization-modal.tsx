import { PropsWithChildren, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "ui/dialog";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { Button } from "ui/button";
import { useToolCustomization } from "@/hooks/use-tool-customizations";
import { safe } from "ts-safe";
import { handleErrorWithToast } from "ui/shared-toast";

export const ToolCustomizationModal = ({
  toolName,
  mcpServerName,
  trigger,
}: PropsWithChildren<{
  toolName: string;
  mcpServerName: string;
  trigger: React.ReactNode;
}>) => {
  const { customization, isLoading, save, remove } = useToolCustomization(
    toolName,
    mcpServerName,
  );

  const [value, setValue] = useState<string>(customization?.customPrompt ?? "");
  const [processing, setProcessing] = useState(false);

  const handleSave = async () => {
    safe(() => setProcessing(true))
      .ifOk(() => save(value))
      .ifFail(handleErrorWithToast)
      .watch(() => setProcessing(false));
  };

  const handleDelete = async () => {
    safe(() => setProcessing(true))
      .ifOk(() => remove())
      .ifOk(() => setValue(""))
      .ifFail(handleErrorWithToast)
      .watch(() => setProcessing(false));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-8">
        <DialogHeader>
          <DialogTitle>Customize Tool</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="tool-custom-prompt">
              Additional instructions for AI
            </Label>
            <Textarea
              id="tool-custom-prompt"
              placeholder="Optional instructions sent to the AI whenever this tool is available."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={processing || isLoading}
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          {customization?.customPrompt && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={processing}
              type="button"
            >
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={processing} type="button">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
