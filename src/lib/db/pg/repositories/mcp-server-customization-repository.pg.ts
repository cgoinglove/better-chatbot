import { pgDb as db } from "../db.pg";
import { McpServerCustomizationSchema } from "../schema.pg";
import { and, eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export type McpServerCustomization = {
  id: string;
  userId: string;
  mcpServerName: string;
  customInstructions?: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const pgMcpServerCustomizationRepository = {
  async getServerCustomization(userId: string, serverName: string) {
    const [row] = await db
      .select({
        customization: McpServerCustomizationSchema,
        name: McpServerCustomizationSchema.mcpServerName,
      })
      .from(McpServerCustomizationSchema)
      .where(
        and(
          eq(McpServerCustomizationSchema.userId, userId),
          eq(McpServerCustomizationSchema.mcpServerName, serverName),
          eq(McpServerCustomizationSchema.enabled, true),
        ),
      );
    if (!row) return null;
    return row.customization as McpServerCustomization;
  },

  async getUserServerCustomizations(userId: string) {
    const rows = await db
      .select({ customization: McpServerCustomizationSchema })
      .from(McpServerCustomizationSchema)
      .where(
        and(
          eq(McpServerCustomizationSchema.userId, userId),
          eq(McpServerCustomizationSchema.enabled, true),
        ),
      );
    return rows.map((r) => r.customization) as McpServerCustomization[];
  },

  async upsertServerCustomization(data: {
    userId: string;
    mcpServerName: string;
    customInstructions?: string | null;
    enabled?: boolean;
  }) {
    const now = new Date();
    const [result] = await db
      .insert(McpServerCustomizationSchema)
      .values({
        id: generateUUID(),
        userId: data.userId,
        mcpServerName: data.mcpServerName,
        customInstructions: data.customInstructions ?? null,
        enabled: data.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          McpServerCustomizationSchema.userId,
          McpServerCustomizationSchema.mcpServerName,
        ],
        set: {
          customInstructions: data.customInstructions ?? null,
          enabled: data.enabled ?? true,
          updatedAt: now,
        },
      })
      .returning();
    return result as McpServerCustomization;
  },

  async deleteServerCustomization(userId: string, serverName: string) {
    await db
      .update(McpServerCustomizationSchema)
      .set({ enabled: false, updatedAt: new Date() })
      .where(
        and(
          eq(McpServerCustomizationSchema.userId, userId),
          eq(McpServerCustomizationSchema.mcpServerName, serverName),
        ),
      );
  },
};
