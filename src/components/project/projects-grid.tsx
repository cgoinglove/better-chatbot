"use client";
import { useState } from "react";
import type { ProjectSummary } from "app-types/project";
import { ProjectCard } from "./project-card";
import { NewProjectDialog } from "./new-project-dialog";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { PlusIcon, SearchIcon, FolderIcon } from "lucide-react";

interface ProjectsGridProps {
  initialProjects: ProjectSummary[];
}

export function ProjectsGrid({ initialProjects }: ProjectsGridProps) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = initialProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4 mr-1.5" />
          New project
        </Button>
      </div>

      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderIcon className="size-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">
            {search ? "No projects match your search" : "No projects yet"}
          </p>
          {!search && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
