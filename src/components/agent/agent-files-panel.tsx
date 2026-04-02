"use client";
import { useRef, useState } from "react";
import { FileIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Button } from "ui/button";
import { toast } from "sonner";
import type { AgentFile } from "app-types/agent";
import { cn } from "lib/utils";

interface AgentFilesPanelProps {
  agentId: string;
  initialFiles: AgentFile[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AgentFilesPanel({
  agentId,
  initialFiles,
}: AgentFilesPanelProps) {
  const [files, setFiles] = useState<AgentFile[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/agent/${agentId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const newFile: AgentFile = await res.json();
      setFiles((prev) => [...prev, newFile]);
      toast.success(`Uploaded ${file.name}`);
    } catch {
      toast.error(`Failed to upload ${file.name}`);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (fileId: string, filename: string) => {
    if (!confirm(`Remove "${filename}" from this agent?`)) return;
    try {
      const res = await fetch(`/api/agent/${agentId}/files/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File removed");
    } catch {
      toast.error("Failed to remove file");
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    for (const file of dropped) await uploadFile(file);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileIcon className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">Agent Files</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <PlusIcon className="size-3" />
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            selected.forEach(uploadFile);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1 mb-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40"
            >
              <FileIcon className="size-3 text-muted-foreground shrink-0" />
              <span className="text-xs truncate flex-1">{file.filename}</span>
              <span className="text-xs text-muted-foreground/50 shrink-0">
                {formatBytes(file.size)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => deleteFile(file.id, file.filename)}
              >
                <Trash2Icon className="size-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-center transition-colors cursor-pointer",
          isDragOver && "border-yale-blue bg-yale-blue/10",
          isUploading && "opacity-50 pointer-events-none",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon className="size-5 text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          {isUploading ? "Uploading..." : "Drop files or click to upload"}
        </p>
      </div>
    </div>
  );
}
