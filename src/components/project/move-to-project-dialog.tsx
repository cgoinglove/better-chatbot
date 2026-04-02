"use client";
import { useEffect, useState } from "react";
import { FolderIcon, CheckIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "ui/dialog";
import { Button } from "ui/button";
import { toast } from "sonner";
import type { ProjectSummary } from "@/types/project";

interface MoveToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  currentProjectId?: string | null;
  onMoved?: (projectId: string | null) => void;
}

export function MoveToProjectDialog({
  open,
  onOpenChange,
  threadId,
  currentProjectId,
  onMoved,
}: MoveToProjectDialogProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(
    currentProjectId ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(currentProjectId ?? null);
    setIsFetching(true);
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setIsFetching(false));
  }, [open, currentProjectId]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/threads/${threadId}/project`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selected }),
      });
      if (!res.ok) throw new Error();
      onMoved?.(selected);
      onOpenChange(false);
      toast.success(
        selected ? "Chat moved to project" : "Chat removed from project",
      );
    } catch {
      toast.error("Failed to update chat");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to project</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1 py-2 max-h-64 overflow-y-auto">
          <button
            type="button"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors ${!selected ? "bg-accent/30" : ""}`}
            onClick={() => setSelected(null)}
          >
            <span className="text-muted-foreground">No project</span>
            {!selected && (
              <CheckIcon className="size-3.5 ml-auto text-primary" />
            )}
          </button>
          {isFetching ? (
            <p className="text-xs text-muted-foreground px-3 py-2">
              Loading...
            </p>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors ${selected === p.id ? "bg-accent/30" : ""}`}
                onClick={() => setSelected(p.id)}
              >
                <FolderIcon className="size-3.5 text-yale-blue shrink-0" />
                <span className="truncate">{p.name}</span>
                {selected === p.id && (
                  <CheckIcon className="size-3.5 ml-auto text-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
