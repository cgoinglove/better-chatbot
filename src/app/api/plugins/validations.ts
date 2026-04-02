import { z } from "zod";

const pluginSkillSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  longDescription: z.string(),
  prompt: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
});

const pluginCommandSchema = z.object({
  id: z.string(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  description: z.string(),
  prompt: z.string(),
});

export const insertPluginSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(""),
  category: z
    .enum(["productivity", "research", "legal", "sales", "hr", "custom"])
    .default("custom"),
  icon: z.string().default("Sparkles"),
  color: z.string().default("bg-blue-500/10 text-blue-500"),
  systemPromptAddition: z.string().default(""),
  skills: z.array(pluginSkillSchema).default([]),
  commands: z.array(pluginCommandSchema).default([]),
  isPublic: z.boolean().default(false),
  version: z.string().default("1.0.0"),
});

export const updatePluginSchema = insertPluginSchema.partial();

export function canModifyPlugin(
  plugin: { userId: string | null; isBuiltIn: boolean },
  requestingUserId: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (plugin.isBuiltIn) return false;
  return plugin.userId === requestingUserId;
}

export function canSeedPlugins(role: string): boolean {
  return role === "admin";
}
