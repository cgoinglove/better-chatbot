import z from "zod";
import { ChatMentionSchema } from "./chat";
import { VisibilitySchema } from "./util";

export type AgentIcon = {
  type: "emoji";
  value: string;
  style?: Record<string, string>;
};

// Knowledge sources an agent is allowed to search: standalone knowledge bases
// or a project's namespace. Access is re-validated server-side at retrieval
// time — the stored ids are references, not grants.
export const AgentKnowledgeBaseBindingSchema = z.object({
  type: z.enum(["kb", "project"]),
  id: z.string().uuid(),
  /** Display label snapshot for the UI; never trusted server-side. */
  name: z.string().max(200).optional(),
});
export type AgentKnowledgeBaseBinding = z.infer<
  typeof AgentKnowledgeBaseBindingSchema
>;

export const AgentInstructionsSchema = z.object({
  role: z.string().optional(),
  systemPrompt: z.string().optional(),
  mentions: z.array(ChatMentionSchema).optional(),
  knowledgeBases: z.array(AgentKnowledgeBaseBindingSchema).optional(),
});

export const AgentCreateSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(8000).optional(),
    icon: z
      .object({
        type: z.literal("emoji"),
        value: z.string(),
        style: z.record(z.string(), z.string()).optional(),
      })
      .optional(),
    userId: z.string(),
    instructions: AgentInstructionsSchema,
    visibility: VisibilitySchema.optional().default("private"),
    // Pinned chat model as "provider/model"; null/absent inherits the chat's
    // selected model / routing default.
    model: z.string().max(120).nullable().optional(),
  })
  .strip();
export const AgentUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(8000).optional(),
    icon: z
      .object({
        type: z.literal("emoji"),
        value: z.string(),
        style: z.record(z.string(), z.string()).optional(),
      })
      .optional(),
    instructions: AgentInstructionsSchema.optional(),
    visibility: VisibilitySchema.optional(),
    model: z.string().max(120).nullable().optional(),
  })
  .strip();

export const AgentQuerySchema = z.object({
  type: z.enum(["all", "mine", "shared", "bookmarked"]).default("all"),
  filters: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type AgentVisibility = z.infer<typeof VisibilitySchema>;

export type AgentSummary = {
  id: string;
  name: string;
  description?: string;
  icon?: AgentIcon;
  userId: string;
  visibility: AgentVisibility;
  createdAt: Date;
  updatedAt: Date;
  userName?: string;
  userAvatar?: string;
  isBookmarked?: boolean;
  /** Set when the agent was created from a preset template */
  presetId?: string | null;
  /** Pinned chat model as "provider/model"; null inherits the chat's model */
  model?: string | null;
};

export type Agent = AgentSummary & {
  instructions: z.infer<typeof AgentInstructionsSchema>;
};

export type AgentRepository = {
  insertAgent(
    agent: z.infer<typeof AgentCreateSchema> & {
      organizationId?: string | null;
    },
  ): Promise<Agent>;

  // activeOrganizationId gates the shared (public/readonly) branch: shared
  // agents are only visible when they belong to the caller's active org.
  // Null/undefined => owner-only.
  selectAgentById(
    id: string,
    userId: string,
    activeOrganizationId?: string | null,
  ): Promise<Agent | null>;

  selectAgentsByUserId(userId: string): Promise<Agent[]>;

  // activeOrganizationId scopes the shared-edit branch: a non-owner may only
  // edit a `public` agent that belongs to their active org. Null/undefined =>
  // owner-only (fails closed), matching selectAgentById.
  updateAgent(
    id: string,
    userId: string,
    agent: z.infer<typeof AgentUpdateSchema>,
    activeOrganizationId?: string | null,
  ): Promise<Agent>;

  deleteAgent(id: string, userId: string): Promise<void>;

  selectAgents(
    currentUserId: string,
    filters?: ("all" | "mine" | "shared" | "bookmarked")[],
    limit?: number,
    activeOrganizationId?: string | null,
  ): Promise<AgentSummary[]>;

  checkAccess(
    agentId: string,
    userId: string,
    destructive?: boolean,
    activeOrganizationId?: string | null,
  ): Promise<boolean>;
};

export const AgentGenerateSchema = z.object({
  name: z.string().describe("Agent name"),
  description: z.string().describe("Agent description"),
  instructions: z.string().describe("Agent instructions"),
  role: z.string().describe("Agent role"),
  tools: z
    .array(z.string())
    .describe("Agent allowed tools name")
    .optional()
    .default([]),
});
