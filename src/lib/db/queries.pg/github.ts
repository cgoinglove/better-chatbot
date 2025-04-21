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
import { pgDb as db } from "../db.pg";
import {
  GitHubFileIndexPgSchema,
  GitHubRepositoryPgSchema,
} from "../schema.github";

export const pgGithubService = {
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

    await db.insert(GitHubRepositoryPgSchema).values({
      id: repoId,
      name,
      path,
      description,
      isEnabled: isEnabled ?? true,
      userId,
      createdAt: now,
      updatedAt: now,
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
      .from(GitHubRepositoryPgSchema)
      .where(eq(GitHubRepositoryPgSchema.id, id));

    return result[0] ? result[0] : null;
  },

  async selectRepositoriesByUserId(
    userId: string,
  ): Promise<GitHubRepository[]> {
    const result = await db
      .select()
      .from(GitHubRepositoryPgSchema)
      .where(eq(GitHubRepositoryPgSchema.userId, userId))
      .orderBy(GitHubRepositoryPgSchema.name);

    return result;
  },

  async selectRepositoriesByName(name: string): Promise<GitHubRepository[]> {
    const result = await db
      .select()
      .from(GitHubRepositoryPgSchema)
      .where(eq(GitHubRepositoryPgSchema.name, name));

    return result;
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

    const updates: Partial<typeof GitHubRepositoryPgSchema.$inferInsert> = {
      updatedAt: now,
    };

    if (name !== undefined) updates.name = name;
    if (path !== undefined) updates.path = path;
    if (description !== undefined) updates.description = description;
    if (isEnabled !== undefined) updates.isEnabled = isEnabled;

    const result = await db
      .update(GitHubRepositoryPgSchema)
      .set(updates)
      .where(eq(GitHubRepositoryPgSchema.id, id))
      .returning();

    return result[0] ? result[0] : null;
  },

  async deleteRepository(id: string): Promise<boolean> {
    const result = await db
      .delete(GitHubRepositoryPgSchema)
      .where(eq(GitHubRepositoryPgSchema.id, id))
      .returning();

    return result.length > 0;
  },

  async updateLastIndexed(id: string): Promise<GitHubRepository | null> {
    const now = new Date();

    const result = await db
      .update(GitHubRepositoryPgSchema)
      .set({
        lastIndexed: now,
        updatedAt: now,
      })
      .where(eq(GitHubRepositoryPgSchema.id, id))
      .returning();

    return result[0] ? result[0] : null;
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

    await db.insert(GitHubFileIndexPgSchema).values({
      id: fileId,
      repositoryId,
      filePath,
      content,
      language,
      lastIndexed: now,
      createdAt: now,
      updatedAt: now,
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

    const updates: Partial<typeof GitHubFileIndexPgSchema.$inferInsert> = {
      lastIndexed: now,
      updatedAt: now,
    };

    if (content !== undefined) updates.content = content;
    if (language !== undefined) updates.language = language;

    const result = await db
      .update(GitHubFileIndexPgSchema)
      .set(updates)
      .where(eq(GitHubFileIndexPgSchema.id, id))
      .returning();

    return result[0] ? result[0] : null;
  },

  async getFileByPath(
    repositoryId: string,
    filePath: string,
  ): Promise<GitHubFileIndex | null> {
    const result = await db
      .select()
      .from(GitHubFileIndexPgSchema)
      .where(
        and(
          eq(GitHubFileIndexPgSchema.repositoryId, repositoryId),
          eq(GitHubFileIndexPgSchema.filePath, filePath),
        ),
      );

    return result[0] ? result[0] : null;
  },

  async deleteFileIndex(id: string): Promise<boolean> {
    const result = await db
      .delete(GitHubFileIndexPgSchema)
      .where(eq(GitHubFileIndexPgSchema.id, id))
      .returning();

    return result.length > 0;
  },

  async deleteAllFilesByRepository(repositoryId: string): Promise<number> {
    const result = await db
      .delete(GitHubFileIndexPgSchema)
      .where(eq(GitHubFileIndexPgSchema.repositoryId, repositoryId))
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
        id: GitHubFileIndexPgSchema.id,
        repositoryId: GitHubFileIndexPgSchema.repositoryId,
        repositoryName: GitHubRepositoryPgSchema.name,
        filePath: GitHubFileIndexPgSchema.filePath,
        language: GitHubFileIndexPgSchema.language,
        content: GitHubFileIndexPgSchema.content,
      })
      .from(GitHubFileIndexPgSchema)
      .innerJoin(
        GitHubRepositoryPgSchema,
        eq(GitHubFileIndexPgSchema.repositoryId, GitHubRepositoryPgSchema.id),
      )
      .where(
        and(
          eq(GitHubRepositoryPgSchema.userId, userId),
          eq(GitHubRepositoryPgSchema.isEnabled, true),
        ),
      );

    if (repositoryId) {
      baseQuery = baseQuery.where(
        eq(GitHubRepositoryPgSchema.id, repositoryId),
      );
    }

    const result = await baseQuery
      .where(
        sql`(${GitHubFileIndexPgSchema.filePath} ILIKE ${searchTerm} OR ${GitHubFileIndexPgSchema.content} ILIKE ${searchTerm})`,
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
