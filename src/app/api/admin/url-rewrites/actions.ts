"use server";

import { requireAdminPermission } from "lib/auth/permissions";
import { getSession } from "auth/server";
import { urlRewriteRepository } from "lib/db/repository";
import {
  UrlRewrite,
  UrlRewriteCreateSchema,
  UrlRewriteListQuery,
  UrlRewriteListResult,
  UrlRewriteUpdateSchema,
} from "app-types/url-rewrite";
import { generateUniqueSlug, normalizeSlug } from "lib/url-rewrite/slug";
import { revalidatePath } from "next/cache";
import logger from "logger";
import { errorToString } from "lib/utils";

export type UrlRewriteActionResult =
  | { success: true; rewrite: UrlRewrite }
  | { success: false; message: string };

const ADMIN_PATH = "/admin/url-rewrites";

async function requireAdminUserId(): Promise<string> {
  await requireAdminPermission("manage url rewrites");
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function listUrlRewritesAction(
  query?: UrlRewriteListQuery,
): Promise<UrlRewriteListResult> {
  await requireAdminPermission("list url rewrites");
  return urlRewriteRepository.selectList(query);
}

export async function getUrlRewriteAction(
  id: string,
): Promise<UrlRewrite | null> {
  await requireAdminPermission("view url rewrites");
  return urlRewriteRepository.selectById(id);
}

/** Suggests an unused slug for the create form. */
export async function generateUrlRewriteSlugAction(): Promise<string> {
  await requireAdminPermission("create url rewrites");
  return generateUniqueSlug((slug) => urlRewriteRepository.existsBySlug(slug));
}

export async function isUrlRewriteSlugAvailableAction(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  await requireAdminPermission("create url rewrites");
  if (!slug.trim()) return false;
  return !(await urlRewriteRepository.existsBySlug(slug, excludeId));
}

export async function createUrlRewriteAction(
  input: unknown,
): Promise<UrlRewriteActionResult> {
  try {
    const userId = await requireAdminUserId();
    const parsed = UrlRewriteCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const slug = normalizeSlug(parsed.data.slug);
    if (await urlRewriteRepository.existsBySlug(slug)) {
      return { success: false, message: `Link "${slug}" is already taken` };
    }

    const rewrite = await urlRewriteRepository.create({
      ...parsed.data,
      slug,
      createdBy: userId,
    });
    revalidatePath(ADMIN_PATH);
    return { success: true, rewrite };
  } catch (error) {
    logger.error("Failed to create url rewrite", error);
    return { success: false, message: errorToString(error) };
  }
}

export async function updateUrlRewriteAction(
  input: unknown,
): Promise<UrlRewriteActionResult> {
  try {
    await requireAdminUserId();
    const parsed = UrlRewriteUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const existing = await urlRewriteRepository.selectById(parsed.data.id);
    if (!existing) {
      return { success: false, message: "Link not found" };
    }

    if (parsed.data.slug) {
      const slug = normalizeSlug(parsed.data.slug);
      if (await urlRewriteRepository.existsBySlug(slug, parsed.data.id)) {
        return { success: false, message: `Link "${slug}" is already taken` };
      }
    }

    const rewrite = await urlRewriteRepository.update(parsed.data);
    revalidatePath(ADMIN_PATH);
    revalidatePath(`${ADMIN_PATH}/${parsed.data.id}`);
    return { success: true, rewrite };
  } catch (error) {
    logger.error("Failed to update url rewrite", error);
    return { success: false, message: errorToString(error) };
  }
}

export async function deleteUrlRewriteAction(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdminUserId();
    await urlRewriteRepository.deleteById(id);
    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete url rewrite", error);
    return { success: false, message: errorToString(error) };
  }
}
