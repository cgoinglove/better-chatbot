import { Library, LibraryEntry, LibraryEntryUpdate, LibraryUpdate } from "app-types/library";
import { eq, like, or } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { sqliteDb as db } from "../db.sqlite";
import { LibraryEntrySqliteSchema, LibrarySqliteSchema } from "../schema.library";

const convertToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date): number => {
  return date.getTime();
};

const convertToLibrary = (row: {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: number;
  updatedAt: number;
}): Library => {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    userId: row.userId,
    createdAt: convertToDate(row.createdAt),
    updatedAt: convertToDate(row.updatedAt),
  };
};

const convertToLibraryEntry = (row: {
  id: string;
  libraryId: string;
  title: string;
  content: string;
  source: string | null;
  sourceType: string | null;
  tags: string | null;
  createdAt: number;
  updatedAt: number;
}): LibraryEntry => {
  return {
    id: row.id,
    libraryId: row.libraryId,
    title: row.title,
    content: row.content,
    source: row.source,
    sourceType: row.sourceType as "chat" | "manual" | "canvas" | null,
    tags: row.tags ? JSON.parse(row.tags) : [],
    createdAt: convertToDate(row.createdAt),
    updatedAt: convertToDate(row.updatedAt),
  };
};

export const sqliteLibraryService = {
  // Library operations
  async insertLibrary({
    name,
    description,
    userId,
  }: Omit<Library, "id" | "createdAt" | "updatedAt">): Promise<Library> {
    const libraryId = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await db.insert(LibrarySqliteSchema).values({
      id: libraryId,
      name,
      description,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id: libraryId,
      name,
      description,
      userId,
      createdAt: now,
      updatedAt: now,
    };
  },

  async selectLibrary(id: string): Promise<Library | null> {
    const result = await db
      .select()
      .from(LibrarySqliteSchema)
      .where(eq(LibrarySqliteSchema.id, id));
    
    return result[0] ? convertToLibrary(result[0]) : null;
  },

  async selectLibrariesByUserId(userId: string): Promise<Library[]> {
    const result = await db
      .select()
      .from(LibrarySqliteSchema)
      .where(eq(LibrarySqliteSchema.userId, userId))
      .orderBy(LibrarySqliteSchema.name);
    
    return result.map(convertToLibrary);
  },

  async updateLibrary(id: string, updates: LibraryUpdate): Promise<Library> {
    const now = new Date();
    const timestamp = now.getTime();

    const updateValues: Record<string, unknown> = {
      updatedAt: timestamp,
    };

    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.description !== undefined) updateValues.description = updates.description;

    const result = await db
      .update(LibrarySqliteSchema)
      .set(updateValues)
      .where(eq(LibrarySqliteSchema.id, id))
      .returning();
    
    return convertToLibrary(result[0]);
  },

  async deleteLibrary(id: string): Promise<void> {
    // First delete all entries in the library
    await db
      .delete(LibraryEntrySqliteSchema)
      .where(eq(LibraryEntrySqliteSchema.libraryId, id));
    
    // Then delete the library itself
    await db
      .delete(LibrarySqliteSchema)
      .where(eq(LibrarySqliteSchema.id, id));
  },

  // Library entry operations
  async insertLibraryEntry({
    libraryId,
    title,
    content,
    source,
    sourceType,
    tags,
  }: Omit<LibraryEntry, "id" | "createdAt" | "updatedAt">): Promise<LibraryEntry> {
    const entryId = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await db.insert(LibraryEntrySqliteSchema).values({
      id: entryId,
      libraryId,
      title,
      content,
      source,
      sourceType,
      tags: tags ? JSON.stringify(tags) : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id: entryId,
      libraryId,
      title,
      content,
      source,
      sourceType,
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
    };
  },

  async selectLibraryEntry(id: string): Promise<LibraryEntry | null> {
    const result = await db
      .select()
      .from(LibraryEntrySqliteSchema)
      .where(eq(LibraryEntrySqliteSchema.id, id));
    
    return result[0] ? convertToLibraryEntry(result[0]) : null;
  },

  async selectLibraryEntriesByLibraryId(libraryId: string): Promise<LibraryEntry[]> {
    const result = await db
      .select()
      .from(LibraryEntrySqliteSchema)
      .where(eq(LibraryEntrySqliteSchema.libraryId, libraryId))
      .orderBy(LibraryEntrySqliteSchema.title);
    
    return result.map(convertToLibraryEntry);
  },

  async updateLibraryEntry(id: string, updates: LibraryEntryUpdate): Promise<LibraryEntry> {
    const now = new Date();
    const timestamp = now.getTime();

    const updateValues: Record<string, unknown> = {
      updatedAt: timestamp,
    };

    if (updates.title !== undefined) updateValues.title = updates.title;
    if (updates.content !== undefined) updateValues.content = updates.content;
    if (updates.source !== undefined) updateValues.source = updates.source;
    if (updates.sourceType !== undefined) updateValues.sourceType = updates.sourceType;
    if (updates.tags !== undefined) updateValues.tags = JSON.stringify(updates.tags);

    const result = await db
      .update(LibraryEntrySqliteSchema)
      .set(updateValues)
      .where(eq(LibraryEntrySqliteSchema.id, id))
      .returning();
    
    return convertToLibraryEntry(result[0]);
  },

  async deleteLibraryEntry(id: string): Promise<void> {
    await db
      .delete(LibraryEntrySqliteSchema)
      .where(eq(LibraryEntrySqliteSchema.id, id));
  },

  async searchLibraryEntries(query: string, userId: string): Promise<LibraryEntry[]> {
    // First get all libraries for this user
    const libraries = await db
      .select()
      .from(LibrarySqliteSchema)
      .where(eq(LibrarySqliteSchema.userId, userId));
    
    const libraryIds = libraries.map(lib => lib.id);
    
    if (libraryIds.length === 0) {
      return [];
    }
    
    // Then search for entries in those libraries
    const result = await db
      .select()
      .from(LibraryEntrySqliteSchema)
      .where(
        and(
          inArray(LibraryEntrySqliteSchema.libraryId, libraryIds),
          or(
            like(LibraryEntrySqliteSchema.title, `%${query}%`),
            like(LibraryEntrySqliteSchema.content, `%${query}%`),
            like(LibraryEntrySqliteSchema.tags, `%${query}%`)
          )
        )
      )
      .orderBy(LibraryEntrySqliteSchema.title);
    
    return result.map(convertToLibraryEntry);
  }
};

// Helper function for the 'in' operator
function inArray(column: any, values: any[]) {
  return or(...values.map(value => eq(column, value)));
}

function and(...conditions: any[]) {
  return {
    operator: 'AND',
    conditions
  };
}
