import { McpServerCustomizationRepository } from "app-types/mcp";
import { pgDb as db } from "../db.pg";
import { McpServerCustomizationSchema, McpServerSchema } from "../schema.pg";
import { and, eq } from "drizzle-orm";

export type McpServerCustomization = {
  id: string;
  userId: string;
  mcpServerName: string;
  customInstructions?: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const pgMcpServerCustomizationRepository: McpServerCustomizationRepository =
  {
    async selectByUserIdAndMcpServerId({ userId, mcpServerId }) {
      const [row] = await db
        .select({
          id: McpServerCustomizationSchema.id,
          userId: McpServerCustomizationSchema.userId,
          mcpServerId: McpServerCustomizationSchema.mcpServerId,
          prompt: McpServerCustomizationSchema.prompt,
          serverName: McpServerSchema.name,
        })
        .from(McpServerCustomizationSchema)
        .innerJoin(
          McpServerSchema,
          eq(McpServerCustomizationSchema.mcpServerId, McpServerSchema.id),
        )
        .where(
          and(
            eq(McpServerCustomizationSchema.userId, userId),
            eq(McpServerCustomizationSchema.mcpServerId, mcpServerId),
          ),
        );
      return row ?? null;
    },

    async selectByUserId(userId) {
      const rows = await db
        .select({
          id: McpServerCustomizationSchema.id,
          userId: McpServerCustomizationSchema.userId,
          mcpServerId: McpServerCustomizationSchema.mcpServerId,
          prompt: McpServerCustomizationSchema.prompt,
          serverName: McpServerSchema.name,
        })
        .from(McpServerCustomizationSchema)
        .innerJoin(
          McpServerSchema,
          eq(McpServerCustomizationSchema.mcpServerId, McpServerSchema.id),
        )
        .where(and(eq(McpServerCustomizationSchema.userId, userId)));
      return rows;
    },

    async upsertMcpServerCustomization(data) {
      const now = new Date();
      const [result] = await db
        .insert(McpServerCustomizationSchema)
        .values({
          userId: data.userId,
          mcpServerId: data.mcpServerId,
          prompt: data.prompt ?? null,
        })
        .onConflictDoUpdate({
          target: [
            McpServerCustomizationSchema.userId,
            McpServerCustomizationSchema.mcpServerId,
          ],
          set: {
            prompt: data.prompt ?? null,
            updatedAt: now,
          },
        })
        .returning();
      return result;
    },

    async deleteMcpServerCustomizationByMcpServerIdAndUserId(key: {
      mcpServerId: string;
      userId: string;
    }) {
      await db
        .delete(McpServerCustomizationSchema)
        .where(
          and(
            eq(McpServerCustomizationSchema.mcpServerId, key.mcpServerId),
            eq(McpServerCustomizationSchema.userId, key.userId),
          ),
        );
    },
  };
