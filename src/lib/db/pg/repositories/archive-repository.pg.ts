import {
  Archive,
  ArchiveItem,
  ArchiveRepository,
  ArchiveWithItemCount,
} from "app-types/archive";
import { pgDb as db } from "../db.pg";
import { ArchiveTable, ArchiveItemTable } from "../schema.pg";
import { and, eq, count } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgArchiveRepository: ArchiveRepository = {
  async createArchive(archive) {
    const [result] = await db
      .insert(ArchiveTable)
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
        id: ArchiveTable.id,
        name: ArchiveTable.name,
        description: ArchiveTable.description,
        userId: ArchiveTable.userId,
        createdAt: ArchiveTable.createdAt,
        updatedAt: ArchiveTable.updatedAt,
        itemCount: count(ArchiveItemTable.id),
      })
      .from(ArchiveTable)
      .leftJoin(
        ArchiveItemTable,
        eq(ArchiveTable.id, ArchiveItemTable.archiveId),
      )
      .where(eq(ArchiveTable.userId, userId))
      .groupBy(ArchiveTable.id)
      .orderBy(ArchiveTable.updatedAt);

    return result.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount),
    })) as ArchiveWithItemCount[];
  },

  async getArchiveById(id) {
    const [result] = await db
      .select()
      .from(ArchiveTable)
      .where(eq(ArchiveTable.id, id));
    return result as Archive | null;
  },

  async updateArchive(id, archive) {
    const [result] = await db
      .update(ArchiveTable)
      .set({
        name: archive.name,
        description: archive.description,
        updatedAt: new Date(),
      })
      .where(eq(ArchiveTable.id, id))
      .returning();
    return result as Archive;
  },

  async deleteArchive(id) {
    await db.delete(ArchiveItemTable).where(eq(ArchiveItemTable.archiveId, id));
    await db.delete(ArchiveTable).where(eq(ArchiveTable.id, id));
  },

  async addItemToArchive(archiveId, itemId, userId) {
    const [result] = await db
      .insert(ArchiveItemTable)
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
      .delete(ArchiveItemTable)
      .where(
        and(
          eq(ArchiveItemTable.archiveId, archiveId),
          eq(ArchiveItemTable.itemId, itemId),
        ),
      );
  },

  async getArchiveItems(archiveId) {
    const result = await db
      .select()
      .from(ArchiveItemTable)
      .where(eq(ArchiveItemTable.archiveId, archiveId))
      .orderBy(ArchiveItemTable.addedAt);
    return result as ArchiveItem[];
  },

  async getItemArchives(itemId, userId) {
    const result = await db
      .select({
        id: ArchiveTable.id,
        name: ArchiveTable.name,
        description: ArchiveTable.description,
        userId: ArchiveTable.userId,
        createdAt: ArchiveTable.createdAt,
        updatedAt: ArchiveTable.updatedAt,
      })
      .from(ArchiveTable)
      .innerJoin(
        ArchiveItemTable,
        eq(ArchiveTable.id, ArchiveItemTable.archiveId),
      )
      .where(
        and(
          eq(ArchiveItemTable.itemId, itemId),
          eq(ArchiveTable.userId, userId),
        ),
      )
      .orderBy(ArchiveTable.name);
    return result as Archive[];
  },
};
