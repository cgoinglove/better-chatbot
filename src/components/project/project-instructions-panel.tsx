"use client";
import { useState } from "react";
import { ListIcon, PlusIcon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { Button } from "ui/button";
import { Textarea } from "ui/textarea";
import { toast } from "sonner";

interface ProjectInstructionsPanelProps {
  projectId: string;
  instructions: string | null;
}

export function ProjectInstructionsPanel({
  projectId,
  instructions: initialInstructions,
}: ProjectInstructionsPanelProps) {
  const [instructions, setInstructions] = useState(initialInstructions ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = () => {
    setDraft(instructions);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft("");
  };

  const saveInstructions = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: draft || null }),
      });
      if (!res.ok) throw new Error();
      setInstructions(draft);
      setIsEditing(false);
      toast.success("Instructions saved");
    } catch {
      toast.error("Failed to save instructions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ListIcon className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">Instructions</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={isEditing ? cancelEdit : startEdit}
        >
          {isEditing ? (
            <XIcon className="size-3" />
          ) : instructions ? (
            <PencilIcon className="size-3" />
          ) : (
            <PlusIcon className="size-3" />
          )}
        </Button>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="text-xs min-h-[120px] resize-none"
            placeholder="Add instructions for this project..."
          />
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              disabled={isSaving}
            >
              <XIcon className="size-3 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={saveInstructions} disabled={isSaving}>
              <CheckIcon className="size-3 mr-1" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {instructions ||
            "No instructions yet. Add custom instructions for all chats in this project."}
        </p>
      )}
    </div>
  );
}
