"use client";
import { useRouter } from "next/navigation";
import { FolderIcon, MoreHorizontalIcon } from "lucide-react";
import { Button } from "ui/button";
import type { Project, ProjectFile } from "app-types/project";
import type { ChatThread } from "app-types/chat";
import { ProjectChatList } from "./project-chat-list";
import { ProjectSidebar } from "./project-sidebar";
import { NewChatInProjectButton } from "./new-chat-in-project-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { toast } from "sonner";

interface ProjectDetailProps {
  project: Project;
  files: ProjectFile[];
  threads: ChatThread[];
}

export function ProjectDetail({ project, files, threads }: ProjectDetailProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Project deleted");
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Center column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border/60">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderIcon className="size-6 text-blue-400" />
              {project.name}
            </h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {project.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {project.description}
            </p>
          )}

          <NewChatInProjectButton
            projectId={project.id}
            projectName={project.name}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <ProjectChatList threads={threads} projectId={project.id} />
        </div>
      </div>

      {/* Right sidebar */}
      <ProjectSidebar project={project} files={files} />
    </div>
  );
}
