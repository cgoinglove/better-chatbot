import { pgDb as db } from "../db.pg";
import { McpServerSchema } from "../schema.pg";
import { eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import type { MCPRepository } from "app-types/mcp";

export const pgMcpRepository: MCPRepository = {
  async save(server) {
    const [result] = await db
      .insert(McpServerSchema)
      .values({
        id: server.id ?? generateUUID(),
        name: server.name,
        config: server.config,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [McpServerSchema.id],
        set: {
          config: server.config,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async selectById(id) {
    const [result] = await db
      .select()
      .from(McpServerSchema)
      .where(eq(McpServerSchema.id, id));
    return result;
  },

  async selectAll() {
    const results = await db.select().from(McpServerSchema);
    return results;
  },

  async deleteById(id) {
    await db.delete(McpServerSchema).where(eq(McpServerSchema.id, id));
  },

  async selectByServerName(name) {
    const [result] = await db
      .select()
      .from(McpServerSchema)
      .where(eq(McpServerSchema.name, name));
    return result;
  },
  async existsByServerName(name) {
    const [result] = await db
      .select({ id: McpServerSchema.id })
      .from(McpServerSchema)
      .where(eq(McpServerSchema.name, name));

    return !!result;
  },
};
