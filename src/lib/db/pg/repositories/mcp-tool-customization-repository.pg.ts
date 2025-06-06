import { pgDb as db } from "../db.pg";
import { McpServerSchema, McpToolCustomizationSchema } from "../schema.pg";
import { and, eq } from "drizzle-orm";
import type { McpToolCustomizationRepository } from "@/types/mcp";

export const pgMcpMcpToolCustomizationRepository: McpToolCustomizationRepository =
  {
    async select(key) {
      const [result] = await db
        .select()
        .from(McpToolCustomizationSchema)
        .where(
          and(
            eq(McpToolCustomizationSchema.userId, key.userId),
            eq(McpToolCustomizationSchema.mcpServerId, key.mcpServerId),
            eq(McpToolCustomizationSchema.toolName, key.toolName),
          ),
        );
      return result;
    },
    async selectByUserIdAndMcpServerId(key) {
      const rows = await db
        .select()
        .from(McpToolCustomizationSchema)
        .where(
          and(
            eq(McpToolCustomizationSchema.userId, key.userId),
            eq(McpToolCustomizationSchema.mcpServerId, key.mcpServerId),
          ),
        );
      return rows;
    },

    async selectByUserId(userId) {
      return db
        .select({
          id: McpToolCustomizationSchema.id,
          userId: McpToolCustomizationSchema.userId,
          toolName: McpToolCustomizationSchema.toolName,
          mcpServerId: McpToolCustomizationSchema.mcpServerId,
          prompt: McpToolCustomizationSchema.prompt,
          serverName: McpServerSchema.name,
        })
        .from(McpToolCustomizationSchema)
        .innerJoin(
          McpServerSchema,
          eq(McpToolCustomizationSchema.mcpServerId, McpServerSchema.id),
        )
        .where(and(eq(McpToolCustomizationSchema.userId, userId)));
    },

    async upsertToolCustomization(data) {
      const now = new Date();
      const [result] = await db
        .insert(McpToolCustomizationSchema)
        .values({
          userId: data.userId,
          toolName: data.toolName,
          mcpServerId: data.mcpServerId,
          prompt: data.prompt,
        })
        .onConflictDoUpdate({
          target: [
            McpToolCustomizationSchema.userId,
            McpToolCustomizationSchema.toolName,
            McpToolCustomizationSchema.mcpServerId,
          ],
          set: {
            prompt: data.prompt ?? null,
            updatedAt: now,
          },
        })
        .returning();
      return result as any;
    },

    async deleteToolCustomization(key) {
      await db
        .delete(McpToolCustomizationSchema)
        .where(
          and(
            eq(McpToolCustomizationSchema.mcpServerId, key.mcpServerId),
            eq(McpToolCustomizationSchema.toolName, key.toolName),
            eq(McpToolCustomizationSchema.userId, key.userId),
          ),
        );
    },
  };
