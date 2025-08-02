import type { UIMessage, Message } from "ai";
import { z } from "zod";
import { AllowedMCPServerZodSchema } from "./mcp";
import { UserPreferences } from "./user";

export type ChatModel = {
  provider: string;
  model: string;
};

export type ChatThread = {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  role: UIMessage["role"];
  parts: UIMessage["parts"];
  annotations?: ChatMessageAnnotation[];
  attachments?: unknown[];
  model: string | null;
  createdAt: Date;
};

export const ChatMentionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcpTool"),
    name: z.string(),
    description: z.string().optional(),
    serverName: z.string().optional(),
    serverId: z.string(),
  }),
  z.object({
    type: z.literal("defaultTool"),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("mcpServer"),
    name: z.string(),
    description: z.string().optional(),
    toolCount: z.number().optional(),
    serverId: z.string(),
  }),
  z.object({
    type: z.literal("workflow"),
    name: z.string(),
    description: z.string().nullish(),
    workflowId: z.string(),
    icon: z
      .object({
        type: z.literal("emoji"),
        value: z.string(),
        style: z.record(z.string(), z.string()).optional(),
      })
      .nullish(),
  }),
  z.object({
    type: z.literal("agent"),
    name: z.string(),
    description: z.string().nullish(),
    agentId: z.string(),
    icon: z
      .object({
        type: z.literal("emoji"),
        value: z.string(),
        style: z.record(z.string(), z.string()).optional(),
      })
      .nullish(),
  }),
]);

export type ChatMention = z.infer<typeof ChatMentionSchema>;

export type ChatMessageAnnotation = {
  usageTokens?: number;
  toolChoice?: "auto" | "none" | "manual";
  [key: string]: any;
};

export const chatApiSchemaRequestBodySchema = z.object({
  id: z.string(),
  message: z.any() as z.ZodType<UIMessage>,
  thinking: z.boolean().optional(),
  chatModel: z
    .object({
      provider: z.string(),
      model: z.string(),
    })
    .optional(),
  toolChoice: z.enum(["auto", "none", "manual"]),
  mentions: z.array(ChatMentionSchema).optional(),
  allowedMcpServers: z.record(z.string(), AllowedMCPServerZodSchema).optional(),
  allowedAppDefaultToolkit: z.array(z.string()).optional(),
});

export type ChatApiSchemaRequestBody = z.infer<
  typeof chatApiSchemaRequestBodySchema
>;

export type ToolInvocationUIPart = Extract<
  Exclude<Message["parts"], undefined>[number],
  { type: "tool-invocation" }
>;

export type ChatRepository = {
  insertThread(thread: Omit<ChatThread, "createdAt">): Promise<ChatThread>;

  selectThread(id: string): Promise<ChatThread | null>;

  deleteChatMessage(id: string): Promise<void>;

  selectThreadDetails(id: string): Promise<
    | (ChatThread & {
        messages: ChatMessage[];
        userPreferences?: UserPreferences;
      })
    | null
  >;

  selectMessagesByThreadId(threadId: string): Promise<ChatMessage[]>;

  selectThreadsByUserId(userId: string): Promise<
    (ChatThread & {
      lastMessageAt: number;
    })[]
  >;

  updateThread(
    id: string,
    thread: Partial<Omit<ChatThread, "id" | "createdAt">>,
  ): Promise<ChatThread>;

  deleteThread(id: string): Promise<void>;

  upsertThread(
    thread: PartialBy<Omit<ChatThread, "createdAt">, "userId">,
  ): Promise<ChatThread>;

  insertMessage(message: Omit<ChatMessage, "createdAt">): Promise<ChatMessage>;
  upsertMessage(message: Omit<ChatMessage, "createdAt">): Promise<ChatMessage>;

  deleteMessagesByChatIdAfterTimestamp(messageId: string): Promise<void>;

  deleteAllThreads(userId: string): Promise<void>;

  deleteUnarchivedThreads(userId: string): Promise<void>;

  insertMessages(
    messages: PartialBy<ChatMessage, "createdAt">[],
  ): Promise<ChatMessage[]>;
};

export const ClientToolInvocationZodSchema = z.object({
  action: z.enum(["manual", "direct"]),
  result: z.any().optional(),
});

export type ClientToolInvocation = z.infer<
  typeof ClientToolInvocationZodSchema
>;
