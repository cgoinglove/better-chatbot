import type { ReactNode } from "react";
import type { Project } from "app-types/project";
import type { ChatThread } from "app-types/chat";
import { ProjectChatList } from "./project-chat-list";
import { ProjectSidebar } from "./project-sidebar";

interface ProjectDetailProps {
  project: Project;
  threads: ChatThread[];
  filesPanel: ReactNode;
}

export function ProjectDetail({
  project,
  threads,
  filesPanel,
}: ProjectDetailProps) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Center: chat list */}
      <main className="flex-1 flex flex-col min-w-0 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground text-sm">
                {project.description}
              </p>
            )}
          </div>
          <ProjectChatList threads={threads} projectId={project.id} />
        </div>
      </main>

      {/* Right sidebar */}
      <div className="w-72 shrink-0">
        <ProjectSidebar
          projectId={project.id}
          memory={project.memory}
          instructions={project.instructions}
          filesPanel={filesPanel}
        />
      </div>
    </div>
  );
}
