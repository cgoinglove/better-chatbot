import {
  ProjectRepository,
  Project,
  ProjectFile,
  ProjectSummary,
} from "app-types/project";
import { pgDb as db } from "../db.pg";
import { ProjectTable, ProjectFileTable, ChatThreadTable } from "../schema.pg";
import { and, eq, count, desc } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgProjectRepository: ProjectRepository = {
  async insertProject(data) {
    const [result] = await db
      .insert(ProjectTable)
      .values({
        id: generateUUID(),
        userId: data.userId,
        name: data.name,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        memory: data.memory ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result as Project;
  },

  async selectProjectById(id, userId) {
    const [result] = await db
      .select()
      .from(ProjectTable)
      .where(and(eq(ProjectTable.id, id), eq(ProjectTable.userId, userId)));
    return (result as Project) ?? null;
  },

  async selectProjectsByUserId(userId) {
    const result = await db
      .select({
        id: ProjectTable.id,
        name: ProjectTable.name,
        description: ProjectTable.description,
        updatedAt: ProjectTable.updatedAt,
        fileCount: count(ProjectFileTable.id),
        threadCount: count(ChatThreadTable.id),
      })
      .from(ProjectTable)
      .leftJoin(
        ProjectFileTable,
        eq(ProjectTable.id, ProjectFileTable.projectId),
      )
      .leftJoin(ChatThreadTable, eq(ProjectTable.id, ChatThreadTable.projectId))
      .where(eq(ProjectTable.userId, userId))
      .groupBy(ProjectTable.id)
      .orderBy(desc(ProjectTable.updatedAt));

    return result.map((row) => ({
      ...row,
      fileCount: Number(row.fileCount),
      threadCount: Number(row.threadCount),
    })) as ProjectSummary[];
  },

  async updateProject(id, userId, data) {
    const [result] = await db
      .update(ProjectTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(ProjectTable.id, id), eq(ProjectTable.userId, userId)))
      .returning();
    return result as Project;
  },

  async deleteProject(id, userId) {
    await db
      .delete(ProjectTable)
      .where(and(eq(ProjectTable.id, id), eq(ProjectTable.userId, userId)));
  },

  async insertProjectFile(data) {
    const [result] = await db
      .insert(ProjectFileTable)
      .values({
        id: generateUUID(),
        projectId: data.projectId,
        userId: data.userId,
        storageKey: data.storageKey,
        filename: data.filename,
        contentType: data.contentType,
        size: data.size,
        createdAt: new Date(),
      })
      .returning();
    return result as ProjectFile;
  },

  async selectProjectFiles(projectId) {
    const result = await db
      .select()
      .from(ProjectFileTable)
      .where(eq(ProjectFileTable.projectId, projectId))
      .orderBy(ProjectFileTable.createdAt);
    return result as ProjectFile[];
  },

  async selectProjectFileById(id, projectId, userId) {
    const [result] = await db
      .select()
      .from(ProjectFileTable)
      .where(
        and(
          eq(ProjectFileTable.id, id),
          eq(ProjectFileTable.projectId, projectId),
          eq(ProjectFileTable.userId, userId),
        ),
      );
    return (result as ProjectFile) ?? null;
  },

  async deleteProjectFile(id, projectId, userId) {
    await db
      .delete(ProjectFileTable)
      .where(
        and(
          eq(ProjectFileTable.id, id),
          eq(ProjectFileTable.projectId, projectId),
          eq(ProjectFileTable.userId, userId),
        ),
      );
  },

  async updateProjectMemory(id, userId, memory) {
    await db
      .update(ProjectTable)
      .set({ memory, updatedAt: new Date() })
      .where(and(eq(ProjectTable.id, id), eq(ProjectTable.userId, userId)));
  },
};
