import { pgDb as db } from "../db.pg";
import { McpServerSchema } from "../schema.pg";
import { eq, or } from "drizzle-orm";
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
        userId: server.userId ?? null,
        visibility: server.visibility ?? "private",
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

  async selectAllByAccess(userId) {
    const results = await db
      .select()
      .from(McpServerSchema)
      .where(
        or(
          eq(McpServerSchema.userId, userId),
          eq(McpServerSchema.visibility, "public"),
          eq(McpServerSchema.visibility, "readonly"),
        ),
      );
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

  async checkAccess(id, userId, destructive = false) {
    const [server] = await db
      .select({
        userId: McpServerSchema.userId,
        visibility: McpServerSchema.visibility,
      })
      .from(McpServerSchema)
      .where(eq(McpServerSchema.id, id));
    if (!server) return false;
    if (server.userId === userId) return true;
    if (
      !destructive &&
      (server.visibility === "public" || server.visibility === "readonly")
    )
      return true;
    return false;
  },
  async updateVisibility(id, visibility) {
    await db
      .update(McpServerSchema)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(McpServerSchema.id, id));
  },
};
