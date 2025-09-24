import { pgDb as db } from "../db.pg";
import { McpServerSchema, UserSchema } from "../schema.pg";
import { eq, or, desc } from "drizzle-orm";
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
        userId: server.userId,
        visibility: server.visibility ?? "private",
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

  async selectAllForUser(userId) {
    // Get user's own MCP servers and featured ones
    const results = await db
      .select({
        id: McpServerSchema.id,
        name: McpServerSchema.name,
        config: McpServerSchema.config,
        enabled: McpServerSchema.enabled,
        userId: McpServerSchema.userId,
        visibility: McpServerSchema.visibility,
        createdAt: McpServerSchema.createdAt,
        updatedAt: McpServerSchema.updatedAt,
        userName: UserSchema.name,
        userAvatar: UserSchema.image,
      })
      .from(McpServerSchema)
      .leftJoin(UserSchema, eq(McpServerSchema.userId, UserSchema.id))
      .where(
        or(
          eq(McpServerSchema.userId, userId),
          eq(McpServerSchema.visibility, "public"),
        ),
      )
      .orderBy(desc(McpServerSchema.createdAt));
    return results;
  },

  async updateVisibility(id, visibility) {
    await db
      .update(McpServerSchema)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(McpServerSchema.id, id));
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
