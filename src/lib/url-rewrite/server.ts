import "server-only";

import { cookies } from "next/headers";
import {
  ChatLinkPreset,
  isUrlRewriteActive,
  UrlRewrite,
} from "app-types/url-rewrite";
import {
  agentRepository,
  mcpRepository,
  urlRewriteRepository,
  workflowRepository,
} from "lib/db/repository";
import { COOKIE_KEY_GOTO_INTENT } from "lib/const";
import { ChatMention } from "app-types/chat";
import logger from "logger";

export type GotoIntent = {
  /** Cookie nonce, used client-side to make sure a preset is applied once. */
  intentId: string;
  slug: string;
  preset: ChatLinkPreset;
};

export async function getActiveUrlRewrite(
  slug: string,
): Promise<UrlRewrite | null> {
  const rewrite = await urlRewriteRepository.selectBySlug(slug);
  if (!rewrite || !isUrlRewriteActive(rewrite)) return null;
  return rewrite;
}

/**
 * A link is created by an admin but opened by anyone, and visibility can change
 * after the fact - so every reference is re-checked against the visitor before
 * it reaches their client. Anything they cannot use is dropped rather than
 * failing the whole link.
 */
export async function sanitizeChatPresetForUser(
  preset: ChatLinkPreset,
  userId: string,
): Promise<ChatLinkPreset> {
  const visibleMcpServerIds = new Set(
    (await mcpRepository.selectAllForUser(userId)).map((server) => server.id),
  );

  const canUseMention = async (mention: ChatMention): Promise<boolean> => {
    switch (mention.type) {
      case "agent":
        return agentRepository.checkAccess(mention.agentId, userId, false);
      case "workflow":
        return workflowRepository.checkAccess(mention.workflowId, userId, true);
      case "mcpServer":
      case "mcpTool":
        return visibleMcpServerIds.has(mention.serverId);
      case "defaultTool":
        return true;
      default:
        return false;
    }
  };

  // A key that was set stays set even if everything in it is filtered out:
  // `undefined` means "keep the visitor's own value", and turning a failed
  // override back into that would silently hand out more than the link allows.
  const mentions = preset.mentions
    ? (
        await Promise.all(
          preset.mentions.map(async (mention) => ({
            mention,
            allowed: await canUseMention(mention).catch(() => false),
          })),
        )
      )
        .filter(({ allowed }) => allowed)
        .map(({ mention }) => mention)
    : undefined;

  const allowedMcpServers = preset.allowedMcpServers
    ? Object.fromEntries(
        Object.entries(preset.allowedMcpServers).filter(([serverId]) =>
          visibleMcpServerIds.has(serverId),
        ),
      )
    : undefined;

  return { ...preset, mentions, allowedMcpServers };
}

/**
 * Reads the pending link cookie during a server render. The cookie is *not*
 * deleted here - `cookies()` is read-only while rendering - the client clears it
 * through `clearGotoIntentAction` once the preset has been applied.
 */
export async function readGotoIntent(
  userId: string,
): Promise<GotoIntent | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_KEY_GOTO_INTENT)?.value;
  if (!raw) return null;

  const separatorIndex = raw.lastIndexOf(".");
  const slug = separatorIndex > 0 ? raw.slice(0, separatorIndex) : raw;
  const intentId = separatorIndex > 0 ? raw.slice(separatorIndex + 1) : raw;
  if (!slug) return null;

  try {
    const rewrite = await getActiveUrlRewrite(slug);
    if (!rewrite || rewrite.target.targetKind !== "chat") return null;

    const preset = await sanitizeChatPresetForUser(
      rewrite.target.preset,
      userId,
    );
    return { intentId, slug: rewrite.slug, preset };
  } catch (error) {
    logger.error("Failed to resolve goto intent", error);
    return null;
  }
}
