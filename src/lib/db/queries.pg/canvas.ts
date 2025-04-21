import { pgDb } from "../db.pg";
import { Canvas, CanvasUpdate } from "app-types/canvas";
import { CanvasPgSchema } from "../schema.canvas";
import { eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgCanvasService = {
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

    await pgDb.insert(CanvasPgSchema).values({
      id: canvasId,
      title,
      content,
      userId,
      createdAt: now,
      updatedAt: now,
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
    const updates: Partial<typeof CanvasPgSchema.$inferInsert> = {
      updatedAt: now,
    };

    if (title !== undefined) {
      updates.title = title;
    }

    if (content !== undefined) {
      updates.content = content;
    }

    await pgDb
      .update(CanvasPgSchema)
      .set(updates)
      .where(eq(CanvasPgSchema.id, id));

    const canvas = await this.selectCanvas(id);
    if (!canvas) {
      throw new Error(`Canvas with id ${id} not found`);
    }

    return canvas;
  },

  async deleteCanvas(id: string): Promise<void> {
    await pgDb.delete(CanvasPgSchema).where(eq(CanvasPgSchema.id, id));
  },

  async selectCanvas(id: string): Promise<Canvas | null> {
    const result = await pgDb
      .select()
      .from(CanvasPgSchema)
      .where(eq(CanvasPgSchema.id, id))
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
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  async selectCanvasesByUserId(userId: string): Promise<Canvas[]> {
    const result = await pgDb
      .select()
      .from(CanvasPgSchema)
      .where(eq(CanvasPgSchema.userId, userId))
      .orderBy(CanvasPgSchema.updatedAt);

    return result.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      userId: row.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },
};
