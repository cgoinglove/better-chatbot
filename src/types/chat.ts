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
  projectId: string | null;
};

export type Project = {
  id: string;
  name: string;
  userId: string;
  instructions: {
    systemPrompt: string;
  };
  createdAt: Date;
  updatedAt: Date;
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

export type ChatMention =
  | {
      type: "tool";
      name: string;
      serverName?: string;
      serverId: string;
    }
  | {
      type: "mcpServer";
      name: string;
      serverId: string;
    }
  | {
      type: "unknown";
      name: string;
    };

export type ChatMessageAnnotation = {
  mentions?: ChatMention[];
  usageTokens?: number;
  toolChoice?: "auto" | "none" | "manual";
  [key: string]: any;
};

export enum AppDefaultToolkit {
  Visualization = "visualization",
}

export const chatApiSchemaRequestBodySchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  message: z.any() as z.ZodType<UIMessage>,
  chatModel: z
    .object({
      provider: z.string(),
      model: z.string(),
    })
    .optional(),
  toolChoice: z.enum(["auto", "none", "manual"]),
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
        instructions: Project["instructions"] | null;
        messages: ChatMessage[];
        userPreferences?: UserPreferences;
      })
    | null
  >;

  selectThreadInstructions(
    userId: string,
    threadId?: string,
  ): Promise<{
    instructions: Project["instructions"] | null;
    userPreferences?: UserPreferences;
    threadId?: string;
    projectId?: string;
  }>;
  selectThreadInstructionsByProjectId(
    userId: string,
    projectId?: string,
  ): Promise<{
    instructions: Project["instructions"] | null;
    userPreferences?: UserPreferences;
  }>;

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

  insertMessage(message: Omit<ChatMessage, "createdAt">): Promise<ChatMessage>;
  upsertMessage(message: Omit<ChatMessage, "createdAt">): Promise<ChatMessage>;

  deleteMessagesByChatIdAfterTimestamp(messageId: string): Promise<void>;

  deleteNonProjectThreads(userId: string): Promise<void>;
  deleteAllThreads(userId: string): Promise<void>;

  insertProject(
    project: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ): Promise<Project>;

  selectProjectById(id: string): Promise<
    | (Project & {
        threads: ChatThread[];
      })
    | null
  >;

  selectProjectsByUserId(
    userId: string,
  ): Promise<Omit<Project, "instructions">[]>;

  updateProject(
    id: string,
    project: Partial<Pick<Project, "name" | "instructions">>,
  ): Promise<Project>;

  deleteProject(id: string): Promise<void>;

  insertMessages(
    messages: PartialBy<ChatMessage, "createdAt">[],
  ): Promise<ChatMessage[]>;
};
