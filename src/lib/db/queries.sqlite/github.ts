import {
  GitHubFileIndex,
  GitHubFileSearchResult,
  GitHubRepository,
} from "app-types/github";
import { and, eq, sql } from "drizzle-orm";
import fs from "fs/promises";
import { glob } from "glob";
import { generateUUID } from "lib/utils";
import path from "path";
import { sqliteDb as db } from "../db.sqlite";
import {
  GitHubFileIndexSqliteSchema,
  GitHubRepositorySqliteSchema,
} from "../schema.github";

export const sqliteGithubService = {
  async insertRepository({
    name,
    path,
    description,
    isEnabled,
    userId,
  }: Omit<
    GitHubRepository,
    "id" | "createdAt" | "updatedAt" | "lastIndexed"
  >): Promise<GitHubRepository> {
    const repoId = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await db.insert(GitHubRepositorySqliteSchema).values({
      id: repoId,
      name,
      path,
      description,
      isEnabled: isEnabled ?? true,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id: repoId,
      name,
      path,
      description,
      isEnabled: isEnabled ?? true,
      userId,
      createdAt: now,
      updatedAt: now,
    };
  },

  async selectRepository(id: string): Promise<GitHubRepository | null> {
    const result = await db
      .select()
      .from(GitHubRepositorySqliteSchema)
      .where(eq(GitHubRepositorySqliteSchema.id, id));

    if (!result[0]) return null;

    return {
      ...result[0],
      isEnabled: Boolean(result[0].isEnabled),
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
      lastIndexed: result[0].lastIndexed
        ? new Date(result[0].lastIndexed)
        : undefined,
    };
  },

  async selectRepositoriesByUserId(
    userId: string,
  ): Promise<GitHubRepository[]> {
    const result = await db
      .select()
      .from(GitHubRepositorySqliteSchema)
      .where(eq(GitHubRepositorySqliteSchema.userId, userId))
      .orderBy(GitHubRepositorySqliteSchema.name);

    return result.map((repo) => ({
      ...repo,
      isEnabled: Boolean(repo.isEnabled),
      createdAt: new Date(repo.createdAt),
      updatedAt: new Date(repo.updatedAt),
      lastIndexed: repo.lastIndexed ? new Date(repo.lastIndexed) : undefined,
    }));
  },

  async selectRepositoriesByName(name: string): Promise<GitHubRepository[]> {
    const result = await db
      .select()
      .from(GitHubRepositorySqliteSchema)
      .where(eq(GitHubRepositorySqliteSchema.name, name));

    return result.map((repo) => ({
      ...repo,
      isEnabled: Boolean(repo.isEnabled),
      createdAt: new Date(repo.createdAt),
      updatedAt: new Date(repo.updatedAt),
      lastIndexed: repo.lastIndexed ? new Date(repo.lastIndexed) : undefined,
    }));
  },

  async updateRepository(
    id: string,
    {
      name,
      path,
      description,
      isEnabled,
    }: Partial<
      Omit<
        GitHubRepository,
        "id" | "userId" | "createdAt" | "updatedAt" | "lastIndexed"
      >
    >,
  ): Promise<GitHubRepository | null> {
    const now = new Date();
    const timestamp = now.getTime();

    const updates: Partial<typeof GitHubRepositorySqliteSchema.$inferInsert> = {
      updatedAt: timestamp,
    };

    if (name !== undefined) updates.name = name;
    if (path !== undefined) updates.path = path;
    if (description !== undefined) updates.description = description;
    if (isEnabled !== undefined) updates.isEnabled = isEnabled ? 1 : 0;

    const result = await db
      .update(GitHubRepositorySqliteSchema)
      .set(updates)
      .where(eq(GitHubRepositorySqliteSchema.id, id))
      .returning();

    if (!result[0]) return null;

    return {
      ...result[0],
      isEnabled: Boolean(result[0].isEnabled),
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
      lastIndexed: result[0].lastIndexed
        ? new Date(result[0].lastIndexed)
        : undefined,
    };
  },

  async deleteRepository(id: string): Promise<boolean> {
    const result = await db
      .delete(GitHubRepositorySqliteSchema)
      .where(eq(GitHubRepositorySqliteSchema.id, id))
      .returning();

    return result.length > 0;
  },

  async updateLastIndexed(id: string): Promise<GitHubRepository | null> {
    const now = new Date();
    const timestamp = now.getTime();

    const result = await db
      .update(GitHubRepositorySqliteSchema)
      .set({
        lastIndexed: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(GitHubRepositorySqliteSchema.id, id))
      .returning();

    if (!result[0]) return null;

    return {
      ...result[0],
      isEnabled: Boolean(result[0].isEnabled),
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
      lastIndexed: result[0].lastIndexed
        ? new Date(result[0].lastIndexed)
        : undefined,
    };
  },

  // File index methods
  async insertFileIndex({
    repositoryId,
    filePath,
    content,
    language,
  }: Omit<
    GitHubFileIndex,
    "id" | "createdAt" | "updatedAt" | "lastIndexed"
  >): Promise<GitHubFileIndex> {
    const fileId = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await db.insert(GitHubFileIndexSqliteSchema).values({
      id: fileId,
      repositoryId,
      filePath,
      content,
      language,
      lastIndexed: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id: fileId,
      repositoryId,
      filePath,
      content,
      language,
      lastIndexed: now,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateFileIndex(
    id: string,
    {
      content,
      language,
    }: Partial<Pick<GitHubFileIndex, "content" | "language">>,
  ): Promise<GitHubFileIndex | null> {
    const now = new Date();
    const timestamp = now.getTime();

    const updates: Partial<typeof GitHubFileIndexSqliteSchema.$inferInsert> = {
      lastIndexed: timestamp,
      updatedAt: timestamp,
    };

    if (content !== undefined) updates.content = content;
    if (language !== undefined) updates.language = language;

    const result = await db
      .update(GitHubFileIndexSqliteSchema)
      .set(updates)
      .where(eq(GitHubFileIndexSqliteSchema.id, id))
      .returning();

    if (!result[0]) return null;

    return {
      ...result[0],
      lastIndexed: new Date(result[0].lastIndexed),
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
    };
  },

  async getFileByPath(
    repositoryId: string,
    filePath: string,
  ): Promise<GitHubFileIndex | null> {
    const result = await db
      .select()
      .from(GitHubFileIndexSqliteSchema)
      .where(
        and(
          eq(GitHubFileIndexSqliteSchema.repositoryId, repositoryId),
          eq(GitHubFileIndexSqliteSchema.filePath, filePath),
        ),
      );

    if (!result[0]) return null;

    return {
      ...result[0],
      lastIndexed: new Date(result[0].lastIndexed),
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
    };
  },

  async deleteFileIndex(id: string): Promise<boolean> {
    const result = await db
      .delete(GitHubFileIndexSqliteSchema)
      .where(eq(GitHubFileIndexSqliteSchema.id, id))
      .returning();

    return result.length > 0;
  },

  async deleteAllFilesByRepository(repositoryId: string): Promise<number> {
    const result = await db
      .delete(GitHubFileIndexSqliteSchema)
      .where(eq(GitHubFileIndexSqliteSchema.repositoryId, repositoryId))
      .returning();

    return result.length;
  },

  async searchFiles(
    repositoryId: string | null,
    query: string,
    userId: string,
  ): Promise<GitHubFileSearchResult[]> {
    // Basic implementation - in a real app, you might want to use a more sophisticated search
    const searchTerm = `%${query}%`;

    let baseQuery = db
      .select({
        id: GitHubFileIndexSqliteSchema.id,
        repositoryId: GitHubFileIndexSqliteSchema.repositoryId,
        repositoryName: GitHubRepositorySqliteSchema.name,
        filePath: GitHubFileIndexSqliteSchema.filePath,
        language: GitHubFileIndexSqliteSchema.language,
        content: GitHubFileIndexSqliteSchema.content,
      })
      .from(GitHubFileIndexSqliteSchema)
      .innerJoin(
        GitHubRepositorySqliteSchema,
        eq(
          GitHubFileIndexSqliteSchema.repositoryId,
          GitHubRepositorySqliteSchema.id,
        ),
      )
      .where(
        and(
          eq(GitHubRepositorySqliteSchema.userId, userId),
          eq(GitHubRepositorySqliteSchema.isEnabled, 1),
        ),
      );

    if (repositoryId) {
      baseQuery = baseQuery.where(
        eq(GitHubRepositorySqliteSchema.id, repositoryId),
      );
    }

    const result = await baseQuery
      .where(
        sql`(${GitHubFileIndexSqliteSchema.filePath} LIKE ${searchTerm} OR ${GitHubFileIndexSqliteSchema.content} LIKE ${searchTerm})`,
      )
      .limit(50);

    return result.map((file) => {
      // Create a snippet from the content
      let snippet = "";
      if (file.content) {
        const contentLower = file.content.toLowerCase();
        const queryLower = query.toLowerCase();
        const index = contentLower.indexOf(queryLower);

        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(file.content.length, index + query.length + 50);
          snippet = file.content.substring(start, end);

          // Add ellipsis if we're not at the beginning or end
          if (start > 0) snippet = "..." + snippet;
          if (end < file.content.length) snippet = snippet + "...";
        }
      }

      return {
        id: file.id,
        repositoryId: file.repositoryId,
        repositoryName: file.repositoryName,
        filePath: file.filePath,
        language: file.language,
        snippet,
        score: 1, // Simple implementation - all matches have the same score
      };
    });
  },

  // Repository indexing
  async indexRepository(repositoryId: string): Promise<number> {
    const repository = await this.selectRepository(repositoryId);
    if (!repository) throw new Error("Repository not found");

    // Check if the repository path exists
    try {
      await fs.access(repository.path);
    } catch (error) {
      throw new Error(`Repository path does not exist: ${repository.path}`);
    }

    // Delete all existing files for this repository
    await this.deleteAllFilesByRepository(repositoryId);

    // Find all files in the repository
    const files = await glob("**/*", {
      cwd: repository.path,
      ignore: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/*.lock",
        "**/package-lock.json",
      ],
      withFileTypes: true,
    }).then((matches) =>
      matches
        .filter((match) => !match.isDirectory())
        .map((match) => match.relative()),
    );

    // Index each file
    let indexedCount = 0;
    for (const file of files) {
      try {
        const filePath = path.join(repository.path, file);
        const stats = await fs.stat(filePath);

        // Skip large files (> 1MB)
        if (stats.size > 1024 * 1024) continue;

        // Read file content
        const content = await fs.readFile(filePath, "utf-8");

        // Determine language based on file extension
        const ext = path.extname(file).toLowerCase();
        let language = "text";

        if ([".js", ".jsx", ".ts", ".tsx"].includes(ext))
          language = "javascript";
        else if ([".py"].includes(ext)) language = "python";
        else if ([".java"].includes(ext)) language = "java";
        else if ([".html", ".htm"].includes(ext)) language = "html";
        else if ([".css"].includes(ext)) language = "css";
        else if ([".json"].includes(ext)) language = "json";
        else if ([".md"].includes(ext)) language = "markdown";

        // Insert or update file index
        const existingFile = await this.getFileByPath(repositoryId, file);

        if (existingFile) {
          await this.updateFileIndex(existingFile.id, { content, language });
        } else {
          await this.insertFileIndex({
            repositoryId,
            filePath: file,
            content,
            language,
          });
        }

        indexedCount++;
      } catch (error) {
        console.error(`Error indexing file ${file}:`, error);
        // Continue with next file
      }
    }

    // Update repository last indexed timestamp
    await this.updateLastIndexed(repositoryId);

    return indexedCount;
  },
};
