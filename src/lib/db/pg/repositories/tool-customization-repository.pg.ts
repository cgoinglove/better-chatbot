import { pgDb as db } from "../db.pg";
import { ToolCustomizationSchema } from "../schema.pg";
import { and, eq } from "drizzle-orm";
import type { ToolCustomizationRepository } from "app-types/tool-customization";
import { generateUUID } from "lib/utils";

export const pgToolCustomizationRepository: ToolCustomizationRepository = {
  async getToolCustomization(userId, toolName, mcpServerName) {
    const [row] = await db
      .select()
      .from(ToolCustomizationSchema)
      .where(
        and(
          eq(ToolCustomizationSchema.userId, userId),
          eq(ToolCustomizationSchema.toolName, toolName),
          eq(ToolCustomizationSchema.mcpServerName, mcpServerName),
          eq(ToolCustomizationSchema.enabled, true),
        ),
      );
    return row ?? null;
  },

  async getUserToolCustomizations(userId) {
    return db
      .select()
      .from(ToolCustomizationSchema)
      .where(
        and(
          eq(ToolCustomizationSchema.userId, userId),
          eq(ToolCustomizationSchema.enabled, true),
        ),
      );
  },

  async upsertToolCustomization(data) {
    const id = generateUUID();
    const now = new Date();
    const [result] = await db
      .insert(ToolCustomizationSchema)
      .values({
        id,
        userId: data.userId,
        toolName: data.toolName,
        mcpServerName: data.mcpServerName,
        customPrompt: data.customPrompt ?? null,
        enabled: data.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          ToolCustomizationSchema.userId,
          ToolCustomizationSchema.toolName,
          ToolCustomizationSchema.mcpServerName,
        ],
        set: {
          customPrompt: data.customPrompt ?? null,
          enabled: data.enabled ?? true,
          updatedAt: now,
        },
      })
      .returning();
    return result as any;
  },

  async deleteToolCustomization(userId, toolName, mcpServerName) {
    await db
      .update(ToolCustomizationSchema)
      .set({ enabled: false, updatedAt: new Date() })
      .where(
        and(
          eq(ToolCustomizationSchema.userId, userId),
          eq(ToolCustomizationSchema.toolName, toolName),
          eq(ToolCustomizationSchema.mcpServerName, mcpServerName),
        ),
      );
  },
};
