import {
  MCPServerBinding,
  MCPServerBindingOwnerType,
  McpService,
} from "app-types/mcp";
import { pgDb as db } from "../db.pg";
import { McpServerBindingSchema } from "../schema.pg";
import { and, eq } from "drizzle-orm";

export const pgMcpService: McpService = {
  saveMcpServerBinding: async (
    entity: MCPServerBinding,
  ): Promise<MCPServerBinding> => {
    const [result] = await db
      .insert(McpServerBindingSchema)
      .values(entity)
      .onConflictDoUpdate({
        target: [
          McpServerBindingSchema.ownerId,
          McpServerBindingSchema.ownerType,
        ],
        set: {
          config: entity.config,
        },
      })
      .returning();
    return result;
  },
  selectMcpServerBinding: async (
    ownerId: string,
    ownerType: MCPServerBindingOwnerType,
  ): Promise<MCPServerBinding | null> => {
    const [result] = await db
      .select()
      .from(McpServerBindingSchema)
      .where(
        and(
          eq(McpServerBindingSchema.ownerId, ownerId),
          eq(McpServerBindingSchema.ownerType, ownerType),
        ),
      );
    return result;
  },
  deleteMcpServerBinding: async (
    ownerId: string,
    ownerType: MCPServerBindingOwnerType,
  ): Promise<void> => {
    await db
      .delete(McpServerBindingSchema)
      .where(
        and(
          eq(McpServerBindingSchema.ownerId, ownerId),
          eq(McpServerBindingSchema.ownerType, ownerType),
        ),
      );
  },
};
