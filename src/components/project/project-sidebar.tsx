import type { ReactNode } from "react";
import { ProjectMemoryPanel } from "./project-memory-panel";
import { ProjectInstructionsPanel } from "./project-instructions-panel";
import { Separator } from "ui/separator";

interface ProjectSidebarProps {
  projectId: string;
  memory: string | null;
  instructions: string | null;
  filesPanel: ReactNode;
}

export function ProjectSidebar({
  projectId,
  memory,
  instructions,
  filesPanel,
}: ProjectSidebarProps) {
  return (
    <aside className="flex flex-col gap-4 p-4 border-l border-border/50 h-full overflow-y-auto">
      <ProjectMemoryPanel projectId={projectId} memory={memory} />
      <Separator />
      <ProjectInstructionsPanel
        projectId={projectId}
        instructions={instructions}
      />
      <Separator />
      {filesPanel}
    </aside>
  );
}
