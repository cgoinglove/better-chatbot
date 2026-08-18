export type ChatRole = "system" | "user" | "assistant" | "data";

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text?: string; reasoning?: string }
  | { type: "file"; url: string; mediaType?: string; filename?: string }
  | { type: "source-url"; url: string; title?: string; mediaType?: string }
  | Record<string, unknown>;

export type UIMessage = {
  id: string;
  role: ChatRole;
  parts: MessagePart[];
  metadata?: ChatMetadata;
};

export type ChatMetadata = {
  chatModel?: ChatModel;
  toolChoice?: ToolChoice;
  toolCount?: number;
  usage?: unknown;
  agentId?: string;
};

export type ChatModel = {
  provider: string;
  model: string;
  name?: string;
  label?: string;
  hasAPIKey?: boolean;
};

export type ToolChoice = "auto" | "manual" | "none";

export type ImageToolChoice = "off" | "openai" | "google";

export type ChatThread = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  lastMessageAt?: number;
  messages?: UIMessage[];
};

export type ChatAttachment = {
  type: "file" | "source-url";
  url: string;
  mediaType?: string;
  filename?: string;
};

export type AuthConfig = {
  baseUrl: string;
  authBasePath: string;
  emailAndPasswordEnabled: boolean;
  signUpEnabled: boolean;
  isFirstUser: boolean;
  socialProviders: {
    github: boolean;
    google: boolean;
    microsoft: boolean;
  };
};
