import { pgDb as db } from "../db.pg";
import { PluginTable, UserPluginTable } from "../schema.pg";
import { eq, or, and } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import type {
  PluginRepository,
  Plugin,
  UserPlugin,
  InsertPlugin,
} from "app-types/plugin";
import { mergePluginWithUserState } from "lib/plugins/plugin-utils";

export const pgPluginRepository: PluginRepository = {
  async listPluginsForUser(userId, tenantId) {
    const rows = await db
      .select({
        plugin: PluginTable,
        userPlugin: UserPluginTable,
      })
      .from(PluginTable)
      .leftJoin(
        UserPluginTable,
        and(
          eq(UserPluginTable.pluginId, PluginTable.id),
          eq(UserPluginTable.userId, userId),
        ),
      )
      .where(
        or(
          eq(PluginTable.userId, userId),
          and(
            eq(PluginTable.tenantId, tenantId),
            eq(PluginTable.isPublic, true),
          ),
        ),
      );

    return rows.map((r) =>
      mergePluginWithUserState(
        r.plugin as Plugin,
        r.userPlugin as UserPlugin | null,
      ),
    );
  },

  async listEnabledPluginsForUser(userId, tenantId) {
    const all = await this.listPluginsForUser(userId, tenantId);
    return all.filter((p) => p.userState?.enabled === true);
  },

  async getPluginById(id, userId) {
    const [row] = await db
      .select({ plugin: PluginTable, userPlugin: UserPluginTable })
      .from(PluginTable)
      .leftJoin(
        UserPluginTable,
        and(
          eq(UserPluginTable.pluginId, PluginTable.id),
          eq(UserPluginTable.userId, userId),
        ),
      )
      .where(eq(PluginTable.id, id));

    if (!row) return null;
    return mergePluginWithUserState(
      row.plugin as Plugin,
      row.userPlugin as UserPlugin | null,
    );
  },

  async insertPlugin(data: InsertPlugin) {
    const [result] = await db
      .insert(PluginTable)
      .values({
        id: generateUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result as Plugin;
  },

  async updatePlugin(id, data) {
    const [result] = await db
      .update(PluginTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(PluginTable.id, id))
      .returning();
    return result as Plugin;
  },

  async deletePlugin(id) {
    await db.delete(PluginTable).where(eq(PluginTable.id, id));
  },

  async enablePlugin(userId, pluginId) {
    return this.upsertUserPlugin({ userId, pluginId, enabled: true });
  },

  async disablePlugin(userId, pluginId) {
    await db
      .update(UserPluginTable)
      .set({ enabled: false, updatedAt: new Date() })
      .where(
        and(
          eq(UserPluginTable.userId, userId),
          eq(UserPluginTable.pluginId, pluginId),
        ),
      );
  },

  async upsertUserPlugin(data) {
    const [result] = await db
      .insert(UserPluginTable)
      .values({
        id: generateUUID(),
        userId: data.userId,
        pluginId: data.pluginId,
        enabled: data.enabled ?? false,
        isPinned: data.isPinned ?? false,
        customSystemPrompt: data.customSystemPrompt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [UserPluginTable.userId, UserPluginTable.pluginId],
        set: {
          enabled: data.enabled ?? false,
          isPinned: data.isPinned ?? false,
          customSystemPrompt: data.customSystemPrompt ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result as UserPlugin;
  },

  async seedPlugins(plugins) {
    const results = await db
      .insert(PluginTable)
      .values(
        plugins.map((p) => ({
          id: generateUUID(),
          ...p,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      )
      .onConflictDoNothing()
      .returning();
    return results as Plugin[];
  },
};
