import {
  MCPServerBinding,
  MCPServerBindingOwnerType,
  McpService,
} from "app-types/mcp";
import { sqliteDb as db } from "../db.sqlite";
import { McpServerBindingSchema } from "../schema.sqlite";
import { and, eq } from "drizzle-orm";
import { convertToMcpServerBinding } from "./utils";

/**
 * @deprecated
 */
export const sqliteMcpService: McpService = {
  saveMcpServerBinding: async (
    entity: MCPServerBinding,
  ): Promise<MCPServerBinding> => {
    const [result] = await db
      .insert(McpServerBindingSchema)
      .values({
        ownerId: entity.ownerId,
        ownerType: entity.ownerType,
        config: JSON.stringify(entity.config),
      })
      .onConflictDoUpdate({
        target: [
          McpServerBindingSchema.ownerId,
          McpServerBindingSchema.ownerType,
        ],
        set: {
          config: JSON.stringify(entity.config),
        },
      })
      .returning();
    return convertToMcpServerBinding(result);
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
    return result ? convertToMcpServerBinding(result) : null;
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
