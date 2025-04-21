import { Canvas, CanvasUpdate } from "app-types/canvas";
import { eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { sqliteDb as db } from "../db.sqlite";
import { CanvasSqliteSchema } from "../schema.canvas";

export const sqliteCanvasService = {
  async insertCanvas({
    title,
    content,
    userId,
    id,
  }: {
    title: string;
    content: string;
    userId: string;
    id?: string;
  }): Promise<Canvas> {
    const canvasId = id || generateUUID();
    const now = new Date();

    await db.insert(CanvasSqliteSchema).values({
      id: canvasId,
      title,
      content,
      userId,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    });

    return {
      id: canvasId,
      title,
      content,
      userId,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateCanvas(
    id: string,
    { title, content }: CanvasUpdate
  ): Promise<Canvas> {
    const now = new Date();
    const updates: Partial<typeof CanvasSqliteSchema.$inferInsert> = {
      updatedAt: now.getTime(),
    };

    if (title !== undefined) {
      updates.title = title;
    }

    if (content !== undefined) {
      updates.content = content;
    }

    await db
      .update(CanvasSqliteSchema)
      .set(updates)
      .where(eq(CanvasSqliteSchema.id, id));

    const canvas = await this.selectCanvas(id);
    if (!canvas) {
      throw new Error(`Canvas with id ${id} not found`);
    }

    return canvas;
  },

  async deleteCanvas(id: string): Promise<void> {
    await db
      .delete(CanvasSqliteSchema)
      .where(eq(CanvasSqliteSchema.id, id));
  },

  async selectCanvas(id: string): Promise<Canvas | null> {
    const result = await db
      .select()
      .from(CanvasSqliteSchema)
      .where(eq(CanvasSqliteSchema.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      userId: row.userId,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  },

  async selectCanvasesByUserId(userId: string): Promise<Canvas[]> {
    const result = await db
      .select()
      .from(CanvasSqliteSchema)
      .where(eq(CanvasSqliteSchema.userId, userId))
      .orderBy(CanvasSqliteSchema.updatedAt);

    return result.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      userId: row.userId,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  },
};
