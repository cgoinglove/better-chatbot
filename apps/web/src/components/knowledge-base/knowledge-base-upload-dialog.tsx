"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { useKnowledgeBases } from "@/hooks/queries/use-knowledge-bases";

const CREATE_NEW = "__create_new__";

/**
 * Chat-level "Upload to knowledge base": pick an existing knowledge base, one
 * of the caller's projects, or create a new knowledge base — then ingest the
 * chosen file into its Agentset namespace.
 */
export function KnowledgeBaseUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { knowledgeBases, projects, isLoading, mutate } = useKnowledgeBases();
  const [target, setTarget] = useState<string>(CREATE_NEW);
  const [newName, setNewName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCreateNew = target === CREATE_NEW;

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    if (isCreateNew && !newName.trim()) {
      toast.error("Name the new knowledge base.");
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadUrl: string;
      if (isCreateNew) {
        const createResponse = await fetch("/api/knowledge-bases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
        if (!createResponse.ok) {
          throw new Error("Failed to create the knowledge base");
        }
        const { knowledgeBase } = await createResponse.json();
        uploadUrl = `/api/knowledge-bases/${knowledgeBase.id}/upload`;
        mutate();
      } else if (target.startsWith("kb:")) {
        uploadUrl = `/api/knowledge-bases/${target.slice(3)}/upload`;
      } else {
        uploadUrl = `/api/projects/${target.slice(8)}/upload`;
      }

      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });
      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      toast.success(
        `"${file.name}" uploaded — processing into the knowledge base.`,
      );
      onOpenChange(false);
      setFile(null);
      setNewName("");
    } catch (error) {
      console.error("Knowledge base upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload to knowledge base</DialogTitle>
          <DialogDescription>
            Store documents in a knowledge base and bind it to agents so they
            can search it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kb-target">Knowledge base</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="kb-target" disabled={isLoading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CREATE_NEW}>
                  + Create new knowledge base
                </SelectItem>
                {knowledgeBases.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Knowledge bases</SelectLabel>
                    {knowledgeBases.map((kb) => (
                      <SelectItem key={kb.id} value={`kb:${kb.id}`}>
                        {kb.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {projects.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Projects</SelectLabel>
                    {projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={`project:${project.id}`}
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {isCreateNew && (
            <div className="space-y-2">
              <Label htmlFor="kb-name">Name</Label>
              <Input
                id="kb-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. German building law"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="kb-file">File</Label>
            <Input
              id="kb-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader className="size-4 animate-spin" />}
            {isSubmitting ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
