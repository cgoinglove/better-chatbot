import { Library, LibraryEntry, LibraryEntryUpdate, LibraryUpdate } from "app-types/library";
import { and, eq, ilike, or } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { pgDb as db } from "../db.pg";
import { LibraryEntryPgSchema, LibraryPgSchema } from "../schema.library";

export const pgLibraryService = {
  // Library operations
  async insertLibrary({
    name,
    description,
    userId,
  }: Omit<Library, "id" | "createdAt" | "updatedAt">): Promise<Library> {
    const now = new Date();
    
    const result = await db
      .insert(LibraryPgSchema)
      .values({
        name,
        description,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    
    return result[0];
  },

  async selectLibrary(id: string): Promise<Library | null> {
    const result = await db
      .select()
      .from(LibraryPgSchema)
      .where(eq(LibraryPgSchema.id, id));
    
    return result[0] || null;
  },

  async selectLibrariesByUserId(userId: string): Promise<Library[]> {
    const result = await db
      .select()
      .from(LibraryPgSchema)
      .where(eq(LibraryPgSchema.userId, userId))
      .orderBy(LibraryPgSchema.name);
    
    return result;
  },

  async updateLibrary(id: string, updates: LibraryUpdate): Promise<Library> {
    const now = new Date();
    
    const updateValues: Record<string, unknown> = {
      updatedAt: now,
    };

    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.description !== undefined) updateValues.description = updates.description;

    const result = await db
      .update(LibraryPgSchema)
      .set(updateValues)
      .where(eq(LibraryPgSchema.id, id))
      .returning();
    
    return result[0];
  },

  async deleteLibrary(id: string): Promise<void> {
    // First delete all entries in the library
    await db
      .delete(LibraryEntryPgSchema)
      .where(eq(LibraryEntryPgSchema.libraryId, id));
    
    // Then delete the library itself
    await db
      .delete(LibraryPgSchema)
      .where(eq(LibraryPgSchema.id, id));
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
    const now = new Date();
    
    const result = await db
      .insert(LibraryEntryPgSchema)
      .values({
        libraryId,
        title,
        content,
        source,
        sourceType,
        tags: tags || [],
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    
    return result[0];
  },

  async selectLibraryEntry(id: string): Promise<LibraryEntry | null> {
    const result = await db
      .select()
      .from(LibraryEntryPgSchema)
      .where(eq(LibraryEntryPgSchema.id, id));
    
    return result[0] || null;
  },

  async selectLibraryEntriesByLibraryId(libraryId: string): Promise<LibraryEntry[]> {
    const result = await db
      .select()
      .from(LibraryEntryPgSchema)
      .where(eq(LibraryEntryPgSchema.libraryId, libraryId))
      .orderBy(LibraryEntryPgSchema.title);
    
    return result;
  },

  async updateLibraryEntry(id: string, updates: LibraryEntryUpdate): Promise<LibraryEntry> {
    const now = new Date();
    
    const updateValues: Record<string, unknown> = {
      updatedAt: now,
    };

    if (updates.title !== undefined) updateValues.title = updates.title;
    if (updates.content !== undefined) updateValues.content = updates.content;
    if (updates.source !== undefined) updateValues.source = updates.source;
    if (updates.sourceType !== undefined) updateValues.sourceType = updates.sourceType;
    if (updates.tags !== undefined) updateValues.tags = updates.tags;

    const result = await db
      .update(LibraryEntryPgSchema)
      .set(updateValues)
      .where(eq(LibraryEntryPgSchema.id, id))
      .returning();
    
    return result[0];
  },

  async deleteLibraryEntry(id: string): Promise<void> {
    await db
      .delete(LibraryEntryPgSchema)
      .where(eq(LibraryEntryPgSchema.id, id));
  },

  async searchLibraryEntries(query: string, userId: string): Promise<LibraryEntry[]> {
    // First get all libraries for this user
    const libraries = await db
      .select()
      .from(LibraryPgSchema)
      .where(eq(LibraryPgSchema.userId, userId));
    
    const libraryIds = libraries.map(lib => lib.id);
    
    if (libraryIds.length === 0) {
      return [];
    }
    
    // Then search for entries in those libraries
    const result = await db
      .select()
      .from(LibraryEntryPgSchema)
      .where(
        and(
          inArray(LibraryEntryPgSchema.libraryId, libraryIds),
          or(
            ilike(LibraryEntryPgSchema.title, `%${query}%`),
            ilike(LibraryEntryPgSchema.content, `%${query}%`)
            // Note: For PostgreSQL, we'd need a different approach to search in the tags array
            // This is a simplified version
          )
        )
      )
      .orderBy(LibraryEntryPgSchema.title);
    
    return result;
  }
};

// Helper function for the 'in' operator
function inArray(column: any, values: any[]) {
  return or(...values.map(value => eq(column, value)));
}
