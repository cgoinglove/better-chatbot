import { ProjectMemoryPanel } from "./project-memory-panel";
import { ProjectInstructionsPanel } from "./project-instructions-panel";
import { ProjectFilesPanel } from "./project-files-panel";
import { Separator } from "ui/separator";
import type { Project, ProjectFile } from "app-types/project";

interface ProjectSidebarProps {
  project: Project;
  files: ProjectFile[];
}

export function ProjectSidebar({ project, files }: ProjectSidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-l border-border/60 bg-sidebar p-4 flex flex-col gap-4 overflow-y-auto">
      <ProjectMemoryPanel projectId={project.id} memory={project.memory} />
      <Separator />
      <ProjectInstructionsPanel
        projectId={project.id}
        instructions={project.instructions}
      />
      <Separator />
      <ProjectFilesPanel projectId={project.id} initialFiles={files} />
    </aside>
  );
}
