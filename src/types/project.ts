// src/types/project.ts

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  instructions: string | null;
  memory: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  userId: string;
  storageKey: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  fileCount: number;
  threadCount: number;
}

export type ProjectRepository = {
  insertProject(
    data: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ): Promise<Project>;
  selectProjectById(id: string, userId: string): Promise<Project | null>;
  selectProjectsByUserId(userId: string): Promise<ProjectSummary[]>;
  updateProject(
    id: string,
    userId: string,
    data: Partial<
      Pick<Project, "name" | "description" | "instructions" | "memory">
    >,
  ): Promise<Project>;
  deleteProject(id: string, userId: string): Promise<void>;
  insertProjectFile(
    data: Omit<ProjectFile, "id" | "createdAt">,
  ): Promise<ProjectFile>;
  selectProjectFiles(projectId: string): Promise<ProjectFile[]>;
  selectProjectFileById(
    id: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectFile | null>;
  deleteProjectFile(
    id: string,
    projectId: string,
    userId: string,
  ): Promise<void>;
  updateProjectMemory(
    id: string,
    userId: string,
    memory: string,
  ): Promise<void>;
};
