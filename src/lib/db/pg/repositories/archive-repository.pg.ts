import {
  Archive,
  ArchiveItem,
  ArchiveRepository,
  ArchiveWithItemCount,
} from "app-types/archive";
import { pgDb as db } from "../db.pg";
import { ArchiveSchema, ArchiveItemSchema } from "../schema.pg";
import { and, eq, count } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgArchiveRepository: ArchiveRepository = {
  async createArchive(archive) {
    const [result] = await db
      .insert(ArchiveSchema)
      .values({
        id: generateUUID(),
        name: archive.name,
        description: archive.description,
        userId: archive.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result as Archive;
  },

  async getArchivesByUserId(userId) {
    const result = await db
      .select({
        id: ArchiveSchema.id,
        name: ArchiveSchema.name,
        description: ArchiveSchema.description,
        userId: ArchiveSchema.userId,
        createdAt: ArchiveSchema.createdAt,
        updatedAt: ArchiveSchema.updatedAt,
        itemCount: count(ArchiveItemSchema.id),
      })
      .from(ArchiveSchema)
      .leftJoin(
        ArchiveItemSchema,
        eq(ArchiveSchema.id, ArchiveItemSchema.archiveId),
      )
      .where(eq(ArchiveSchema.userId, userId))
      .groupBy(ArchiveSchema.id)
      .orderBy(ArchiveSchema.updatedAt);

    return result.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount),
    })) as ArchiveWithItemCount[];
  },

  async getArchiveById(id) {
    const [result] = await db
      .select()
      .from(ArchiveSchema)
      .where(eq(ArchiveSchema.id, id));
    return result as Archive | null;
  },

  async updateArchive(id, archive) {
    const [result] = await db
      .update(ArchiveSchema)
      .set({
        name: archive.name,
        description: archive.description,
        updatedAt: new Date(),
      })
      .where(eq(ArchiveSchema.id, id))
      .returning();
    return result as Archive;
  },

  async deleteArchive(id) {
    await db
      .delete(ArchiveItemSchema)
      .where(eq(ArchiveItemSchema.archiveId, id));
    await db.delete(ArchiveSchema).where(eq(ArchiveSchema.id, id));
  },

  async addItemToArchive(archiveId, itemId, userId) {
    const [result] = await db
      .insert(ArchiveItemSchema)
      .values({
        id: generateUUID(),
        archiveId,
        itemId,
        userId,
        addedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    return result as ArchiveItem;
  },

  async removeItemFromArchive(archiveId, itemId) {
    await db
      .delete(ArchiveItemSchema)
      .where(
        and(
          eq(ArchiveItemSchema.archiveId, archiveId),
          eq(ArchiveItemSchema.itemId, itemId),
        ),
      );
  },

  async getArchiveItems(archiveId) {
    const result = await db
      .select()
      .from(ArchiveItemSchema)
      .where(eq(ArchiveItemSchema.archiveId, archiveId))
      .orderBy(ArchiveItemSchema.addedAt);
    return result as ArchiveItem[];
  },

  async getItemArchives(itemId, userId) {
    const result = await db
      .select({
        id: ArchiveSchema.id,
        name: ArchiveSchema.name,
        description: ArchiveSchema.description,
        userId: ArchiveSchema.userId,
        createdAt: ArchiveSchema.createdAt,
        updatedAt: ArchiveSchema.updatedAt,
      })
      .from(ArchiveSchema)
      .innerJoin(
        ArchiveItemSchema,
        eq(ArchiveSchema.id, ArchiveItemSchema.archiveId),
      )
      .where(
        and(
          eq(ArchiveItemSchema.itemId, itemId),
          eq(ArchiveSchema.userId, userId),
        ),
      )
      .orderBy(ArchiveSchema.name);
    return result as Archive[];
  },
};
