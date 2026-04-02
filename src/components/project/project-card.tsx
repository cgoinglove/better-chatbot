"use client";
import {
  FolderIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  PencilIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ProjectSummary } from "app-types/project";
import { formatTimeAgo } from "lib/date-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { Button } from "ui/button";
import { toast } from "sonner";
import { mutate } from "swr";

interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Project deleted");
      mutate("/api/projects");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-border/60 bg-card p-4 cursor-pointer hover:border-border transition-colors"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FolderIcon className="size-4 shrink-0 text-yale-blue" />
          <span className="font-semibold text-sm truncate">{project.name}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <MoreHorizontalIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/projects/${project.id}`);
              }}
            >
              <PencilIcon className="size-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2Icon className="size-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
          {project.description}
        </p>
      )}

      <div className="mt-auto pt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground/60">
          Updated {formatTimeAgo(new Date(project.updatedAt))}
        </span>
        <span className="text-xs text-muted-foreground/50">
          {project.threadCount} chat{project.threadCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
