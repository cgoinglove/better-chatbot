import { z } from "zod";
import { ChatMentionSchema } from "./chat";
import { AllowedMCPServerZodSchema } from "./mcp";

/**
 * URL rewrites are admin-created short links (`{baseUrl}/goto/{slug}`) that drop
 * a visitor into the app with a pre-configured state.
 *
 * The design is intentionally generic:
 *
 * - A rewrite has a `target`, a discriminated union on `targetKind`. Adding a new
 *   kind of destination (agent landing page, workflow run, external redirect...)
 *   means adding one member here plus one applier - the table, the `/goto` route,
 *   the cookie handoff and the admin list stay untouched.
 * - The `chat` target carries a *preset*: an allow-listed set of default state
 *   values whose keys mirror the client `appStore`. Extending it (voice chat
 *   options, temporary chat, system instructions...) is one key here plus one
 *   line in the applier.
 * - `payloadVersion` is persisted next to the payload so old rows can be migrated
 *   if the shape of a target ever changes incompatibly.
 */

export const URL_REWRITE_PAYLOAD_VERSION = 1;

export const URL_REWRITE_TARGET_KINDS = ["chat"] as const;
export type UrlRewriteTargetKind = (typeof URL_REWRITE_TARGET_KINDS)[number];

export const URL_REWRITE_SLUG_LENGTH = 6;
export const URL_REWRITE_SLUG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/;

export const ChatModelSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
});

/** How the pre-filled message behaves once the visitor lands in the chat. */
export const CHAT_LINK_MESSAGE_MODES = ["prefill", "send"] as const;
export type ChatLinkMessageMode = (typeof CHAT_LINK_MESSAGE_MODES)[number];

export const ChatLinkMessageSchema = z.object({
  text: z.string().min(1).max(4000),
  mode: z.enum(CHAT_LINK_MESSAGE_MODES),
});

/**
 * Default state values applied to the visitor's chat session.
 * Every key maps 1:1 onto a key of the client `appStore`.
 */
export const ChatLinkPresetSchema = z.object({
  chatModel: ChatModelSchema.optional(),
  mentions: z.array(ChatMentionSchema).optional(),
  allowedAppDefaultToolkit: z.array(z.string()).optional(),
  allowedMcpServers: z.record(z.string(), AllowedMCPServerZodSchema).optional(),
  toolChoice: z.enum(["auto", "none", "manual"]).optional(),
  message: ChatLinkMessageSchema.optional(),
});

export type ChatLinkPreset = z.infer<typeof ChatLinkPresetSchema>;

export const UrlRewriteTargetSchema = z.discriminatedUnion("targetKind", [
  z.object({
    targetKind: z.literal("chat"),
    preset: ChatLinkPresetSchema,
  }),
]);

export type UrlRewriteTarget = z.infer<typeof UrlRewriteTargetSchema>;

export const UrlRewriteSlugSchema = z
  .string()
  .trim()
  .regex(
    URL_REWRITE_SLUG_PATTERN,
    "Slug must be 3-64 characters: letters, numbers, dash or underscore, starting with a letter or number",
  );

export const UrlRewriteCreateSchema = z.object({
  slug: UrlRewriteSlugSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullish(),
  enabled: z.boolean().default(true),
  expiresAt: z.coerce.date().nullish(),
  target: UrlRewriteTargetSchema,
});

export const UrlRewriteUpdateSchema = UrlRewriteCreateSchema.partial().extend({
  id: z.uuid(),
});

export type UrlRewriteCreate = z.infer<typeof UrlRewriteCreateSchema>;
export type UrlRewriteUpdate = z.infer<typeof UrlRewriteUpdateSchema>;

export type UrlRewrite = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  targetKind: UrlRewriteTargetKind;
  target: UrlRewriteTarget;
  payloadVersion: number;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Shape of a persisted row, kept here so repositories stay free of schema imports. */
export type UrlRewriteEntityLike = Omit<UrlRewrite, "target"> & {
  payload: UrlRewriteTarget;
};

export type UrlRewriteListItem = UrlRewrite & {
  createdByName: string | null;
};

export type UrlRewriteListQuery = {
  query?: string;
  limit?: number;
  offset?: number;
};

export type UrlRewriteListResult = {
  items: UrlRewriteListItem[];
  total: number;
};

export type UrlRewriteRepository = {
  create(data: UrlRewriteCreate & { createdBy: string }): Promise<UrlRewrite>;
  update(data: UrlRewriteUpdate): Promise<UrlRewrite>;
  deleteById(id: string): Promise<void>;
  selectById(id: string): Promise<UrlRewrite | null>;
  selectBySlug(slug: string): Promise<UrlRewrite | null>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  selectList(query?: UrlRewriteListQuery): Promise<UrlRewriteListResult>;
};

/** A rewrite is only usable while enabled and unexpired. */
export function isUrlRewriteActive(
  rewrite: Pick<UrlRewrite, "enabled" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (!rewrite.enabled) return false;
  if (rewrite.expiresAt && rewrite.expiresAt.getTime() <= now.getTime())
    return false;
  return true;
}
