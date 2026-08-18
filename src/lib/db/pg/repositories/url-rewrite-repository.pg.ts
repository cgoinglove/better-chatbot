import {
  URL_REWRITE_PAYLOAD_VERSION,
  UrlRewrite,
  UrlRewriteEntityLike,
  UrlRewriteListItem,
  UrlRewriteRepository,
} from "app-types/url-rewrite";
import { pgDb as db } from "../db.pg";
import { UrlRewriteTable, UserTable } from "../schema.pg";
import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { normalizeSlug } from "lib/url-rewrite/slug";

const toUrlRewrite = (row: UrlRewriteEntityLike): UrlRewrite => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  enabled: row.enabled,
  targetKind: row.targetKind,
  target: row.payload,
  payloadVersion: row.payloadVersion,
  expiresAt: row.expiresAt,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const pgUrlRewriteRepository: UrlRewriteRepository = {
  async create(data) {
    const [result] = await db
      .insert(UrlRewriteTable)
      .values({
        slug: normalizeSlug(data.slug),
        name: data.name,
        description: data.description ?? null,
        enabled: data.enabled ?? true,
        targetKind: data.target.targetKind,
        payload: data.target,
        payloadVersion: URL_REWRITE_PAYLOAD_VERSION,
        expiresAt: data.expiresAt ?? null,
        createdBy: data.createdBy,
      })
      .returning();
    return toUrlRewrite(result);
  },

  async update({ id, ...data }) {
    const [result] = await db
      .update(UrlRewriteTable)
      .set({
        ...(data.slug !== undefined ? { slug: normalizeSlug(data.slug) } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description ?? null }
          : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.expiresAt !== undefined
          ? { expiresAt: data.expiresAt ?? null }
          : {}),
        ...(data.target !== undefined
          ? {
              targetKind: data.target.targetKind,
              payload: data.target,
              payloadVersion: URL_REWRITE_PAYLOAD_VERSION,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(UrlRewriteTable.id, id))
      .returning();
    return toUrlRewrite(result);
  },

  async deleteById(id) {
    await db.delete(UrlRewriteTable).where(eq(UrlRewriteTable.id, id));
  },

  async selectById(id) {
    const [result] = await db
      .select()
      .from(UrlRewriteTable)
      .where(eq(UrlRewriteTable.id, id));
    return result ? toUrlRewrite(result) : null;
  },

  async selectBySlug(slug) {
    const [result] = await db
      .select()
      .from(UrlRewriteTable)
      .where(eq(UrlRewriteTable.slug, normalizeSlug(slug)));
    return result ? toUrlRewrite(result) : null;
  },

  async existsBySlug(slug, excludeId) {
    const where = excludeId
      ? and(
          eq(UrlRewriteTable.slug, normalizeSlug(slug)),
          ne(UrlRewriteTable.id, excludeId),
        )
      : eq(UrlRewriteTable.slug, normalizeSlug(slug));
    const [result] = await db
      .select({ id: UrlRewriteTable.id })
      .from(UrlRewriteTable)
      .where(where)
      .limit(1);
    return Boolean(result);
  },

  async selectList(query) {
    const limit = query?.limit ?? 20;
    const offset = query?.offset ?? 0;
    const search = query?.query?.trim();
    const where = search
      ? or(
          ilike(UrlRewriteTable.slug, `%${search}%`),
          ilike(UrlRewriteTable.name, `%${search}%`),
        )
      : undefined;

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          rewrite: UrlRewriteTable,
          createdByName: UserTable.name,
        })
        .from(UrlRewriteTable)
        .leftJoin(UserTable, eq(UrlRewriteTable.createdBy, UserTable.id))
        .where(where)
        .orderBy(desc(UrlRewriteTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(UrlRewriteTable)
        .where(where ?? sql`true`),
    ]);

    const items: UrlRewriteListItem[] = rows.map((row) => ({
      ...toUrlRewrite(row.rewrite),
      createdByName: row.createdByName ?? null,
    }));

    return { items, total: Number(totalRow?.value ?? 0) };
  },
};
