import { desc, eq, like } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import "./code-snippet-service-init"; // Import the initialization module
import { isDatabasePg, pgDb, sqliteDb } from "./db";
import {
  CodeSnippetPgSchema,
  CodeSnippetSqliteSchema,
} from "./schema.code-snippet";

// Define the CodeSnippet type
export interface CodeSnippet {
  id: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  tags?: string;
  isFavorite: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper functions for date conversion
const convertToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date): number => {
  return date.getTime();
};

// SQLite implementation
const sqliteCodeSnippetService = {
  async insertCodeSnippet({
    title,
    description,
    code,
    language,
    tags,
    isFavorite,
    userId,
  }: Omit<
    CodeSnippet,
    "id" | "createdAt" | "updatedAt"
  >): Promise<CodeSnippet> {
    const id = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await sqliteDb.insert(CodeSnippetSqliteSchema).values({
      id,
      title,
      description,
      code,
      language,
      tags,
      isFavorite: isFavorite ?? false,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id,
      title,
      description,
      code,
      language,
      tags,
      isFavorite: isFavorite ?? false,
      userId,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateCodeSnippet(
    id: string,
    {
      title,
      description,
      code,
      language,
      tags,
      isFavorite,
    }: Partial<Omit<CodeSnippet, "id" | "userId" | "createdAt" | "updatedAt">>,
  ): Promise<CodeSnippet> {
    const now = new Date();
    const timestamp = now.getTime();

    const result = await sqliteDb
      .update(CodeSnippetSqliteSchema)
      .set({
        title,
        description,
        code,
        language,
        tags,
        isFavorite,
        updatedAt: timestamp,
      })
      .where(eq(CodeSnippetSqliteSchema.id, id))
      .returning();

    return {
      ...result[0],
      createdAt: convertToDate(result[0].createdAt as number),
      updatedAt: convertToDate(result[0].updatedAt as number),
    };
  },

  async deleteCodeSnippet(id: string): Promise<void> {
    await sqliteDb
      .delete(CodeSnippetSqliteSchema)
      .where(eq(CodeSnippetSqliteSchema.id, id));
  },

  async selectCodeSnippet(id: string): Promise<CodeSnippet | null> {
    const result = await sqliteDb
      .select()
      .from(CodeSnippetSqliteSchema)
      .where(eq(CodeSnippetSqliteSchema.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0],
      createdAt: convertToDate(result[0].createdAt as number),
      updatedAt: convertToDate(result[0].updatedAt as number),
    };
  },

  async selectCodeSnippetsByUserId(userId: string): Promise<CodeSnippet[]> {
    const result = await sqliteDb
      .select()
      .from(CodeSnippetSqliteSchema)
      .where(eq(CodeSnippetSqliteSchema.userId, userId))
      .orderBy(desc(CodeSnippetSqliteSchema.updatedAt));

    return result.map((snippet) => ({
      ...snippet,
      createdAt: convertToDate(snippet.createdAt as number),
      updatedAt: convertToDate(snippet.updatedAt as number),
    }));
  },

  async searchCodeSnippets(
    userId: string,
    query: string,
  ): Promise<CodeSnippet[]> {
    const searchTerm = `%${query}%`;

    const result = await sqliteDb
      .select()
      .from(CodeSnippetSqliteSchema)
      .where(eq(CodeSnippetSqliteSchema.userId, userId))
      .where(
        like(CodeSnippetSqliteSchema.title, searchTerm) ||
          like(CodeSnippetSqliteSchema.description || "", searchTerm) ||
          like(CodeSnippetSqliteSchema.code, searchTerm) ||
          like(CodeSnippetSqliteSchema.tags || "", searchTerm),
      )
      .orderBy(desc(CodeSnippetSqliteSchema.updatedAt));

    return result.map((snippet) => ({
      ...snippet,
      createdAt: convertToDate(snippet.createdAt as number),
      updatedAt: convertToDate(snippet.updatedAt as number),
    }));
  },

  async selectCodeSnippetsByLanguage(
    userId: string,
    language: string,
  ): Promise<CodeSnippet[]> {
    const result = await sqliteDb
      .select()
      .from(CodeSnippetSqliteSchema)
      .where(eq(CodeSnippetSqliteSchema.userId, userId))
      .where(eq(CodeSnippetSqliteSchema.language, language))
      .orderBy(desc(CodeSnippetSqliteSchema.updatedAt));

    return result.map((snippet) => ({
      ...snippet,
      createdAt: convertToDate(snippet.createdAt as number),
      updatedAt: convertToDate(snippet.updatedAt as number),
    }));
  },

  async selectFavoriteCodeSnippets(userId: string): Promise<CodeSnippet[]> {
    const result = await sqliteDb
      .select()
      .from(CodeSnippetSqliteSchema)
      .where(eq(CodeSnippetSqliteSchema.userId, userId))
      .where(eq(CodeSnippetSqliteSchema.isFavorite, true))
      .orderBy(desc(CodeSnippetSqliteSchema.updatedAt));

    return result.map((snippet) => ({
      ...snippet,
      createdAt: convertToDate(snippet.createdAt as number),
      updatedAt: convertToDate(snippet.updatedAt as number),
    }));
  },
};

// PostgreSQL implementation
const pgCodeSnippetService = {
  async insertCodeSnippet({
    title,
    description,
    code,
    language,
    tags,
    isFavorite,
    userId,
  }: Omit<
    CodeSnippet,
    "id" | "createdAt" | "updatedAt"
  >): Promise<CodeSnippet> {
    const result = await pgDb
      .insert(CodeSnippetPgSchema)
      .values({
        title,
        description,
        code,
        language,
        tags,
        isFavorite: isFavorite ?? false,
        userId,
      })
      .returning();

    return {
      ...result[0],
      createdAt: result[0].createdAt as Date,
      updatedAt: result[0].updatedAt as Date,
    };
  },

  async updateCodeSnippet(
    id: string,
    {
      title,
      description,
      code,
      language,
      tags,
      isFavorite,
    }: Partial<Omit<CodeSnippet, "id" | "userId" | "createdAt" | "updatedAt">>,
  ): Promise<CodeSnippet> {
    const now = new Date();

    const result = await pgDb
      .update(CodeSnippetPgSchema)
      .set({
        title,
        description,
        code,
        language,
        tags,
        isFavorite,
        updatedAt: now,
      })
      .where(eq(CodeSnippetPgSchema.id, id))
      .returning();

    return {
      ...result[0],
      createdAt: result[0].createdAt as Date,
      updatedAt: result[0].updatedAt as Date,
    };
  },

  async deleteCodeSnippet(id: string): Promise<void> {
    await pgDb
      .delete(CodeSnippetPgSchema)
      .where(eq(CodeSnippetPgSchema.id, id));
  },

  async selectCodeSnippet(id: string): Promise<CodeSnippet | null> {
    const result = await pgDb
      .select()
      .from(CodeSnippetPgSchema)
      .where(eq(CodeSnippetPgSchema.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0],
      createdAt: result[0].createdAt as Date,
      updatedAt: result[0].updatedAt as Date,
    };
  },

  async selectCodeSnippetsByUserId(userId: string): Promise<CodeSnippet[]> {
    const result = await pgDb
      .select()
      .from(CodeSnippetPgSchema)
      .where(eq(CodeSnippetPgSchema.userId, userId))
      .orderBy(desc(CodeSnippetPgSchema.updatedAt));

    return result.map((snippet) => ({
      ...snippet,
      createdAt: snippet.createdAt as Date,
      updatedAt: snippet.updatedAt as Date,
    }));
  },

  async searchCodeSnippets(
    userId: string,
    query: string,
  ): Promise<CodeSnippet[]> {
    const searchTerm = `%${query}%`;

    const result = await pgDb
      .select()
      .from(CodeSnippetPgSchema)
      .where(eq(CodeSnippetPgSchema.userId, userId))
      .where(
        like(CodeSnippetPgSchema.title, searchTerm) ||
          like(CodeSnippetPgSchema.description || "", searchTerm) ||
          like(CodeSnippetPgSchema.code, searchTerm) ||
          like(CodeSnippetPgSchema.tags || "", searchTerm),
      )
      .orderBy(desc(CodeSnippetPgSchema.updatedAt));

    return result.map((snippet) => ({
      ...snippet,
      createdAt: snippet.createdAt as Date,
      updatedAt: snippet.updatedAt as Date,
    }));
  },

  async selectCodeSnippetsByLanguage(
    userId: string,
    language: string,
  ): Promise<CodeSnippet[]> {
    const result = await pgDb
      .select()
      .from(CodeSnippetPgSchema)
      .where(eq(CodeSnippetPgSchema.userId, userId))
      .where(eq(CodeSnippetPgSchema.language, language))
      .orderBy(desc(CodeSnippetPgSchema.updatedAt));

    return result.map((snippet) => ({
      ...snippet,
      createdAt: snippet.createdAt as Date,
      updatedAt: snippet.updatedAt as Date,
    }));
  },

  async selectFavoriteCodeSnippets(userId: string): Promise<CodeSnippet[]> {
    const result = await pgDb
      .select()
      .from(CodeSnippetPgSchema)
      .where(eq(CodeSnippetPgSchema.userId, userId))
      .where(eq(CodeSnippetPgSchema.isFavorite, true))
      .orderBy(desc(CodeSnippetPgSchema.updatedAt));

    return result.map((snippet) => ({
      ...snippet,
      createdAt: snippet.createdAt as Date,
      updatedAt: snippet.updatedAt as Date,
    }));
  },
};

// Export the appropriate service based on the database type
export const codeSnippetService = isDatabasePg
  ? pgCodeSnippetService
  : sqliteCodeSnippetService;
