import { Platform } from "react-native";
import { authClient } from "./auth";
import { BACKEND_URL } from "./config";
import type {
  AuthConfig,
  ChatAttachment,
  ImageToolChoice,
  ChatModel,
  ChatThread,
  ToolChoice,
  UIMessage,
} from "./types";

type RequestOptions = RequestInit & {
  json?: unknown;
};

type ModelGroup = {
  provider: string;
  hasAPIKey?: boolean;
  models: {
    name: string;
    label?: string;
    hasAPIKey?: boolean;
  }[];
};

export async function apiFetch(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  const cookie = Platform.OS === "web" ? undefined : authClient.getCookie?.();

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (options.json !== undefined) {
    headers.set("content-type", "application/json");
  }

  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers,
    body:
      options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });
}

export async function apiJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(readErrorMessage(text, response.status));
  }

  return response.json() as Promise<T>;
}

function readErrorMessage(text: string, status: number) {
  if (!text) {
    return `Request failed with ${status}`;
  }

  try {
    const json = JSON.parse(text);
    if (typeof json.message === "string") return json.message;
    if (typeof json.error === "string") return json.error;
  } catch {
    // Fall back to plain text below.
  }

  return text.replace(/<[^>]*>/g, "").trim() || `Request failed with ${status}`;
}

export function getAuthConfig() {
  return apiJson<AuthConfig>("/api/mobile/auth/config");
}

export async function getModels() {
  const groups = await apiJson<ModelGroup[]>("/api/chat/models");

  return groups.flatMap((group) =>
    group.models.map((model) => ({
      provider: group.provider,
      model: model.name,
      name: model.label || model.name,
      label: `${group.provider}/${model.name}`,
      hasAPIKey: model.hasAPIKey ?? group.hasAPIKey,
    })),
  ) satisfies ChatModel[];
}

export function getThreads() {
  return apiJson<ChatThread[]>("/api/thread");
}

export function getThread(id: string) {
  return apiJson<ChatThread>(`/api/thread/${id}`);
}

export function renameThread(id: string, title: string) {
  return apiJson<ChatThread>(`/api/thread/${id}`, {
    method: "PATCH",
    json: { title },
  });
}

export function deleteThread(id: string) {
  return apiJson<{ success: boolean }>(`/api/thread/${id}`, {
    method: "DELETE",
  });
}

export function deleteMessage(id: string) {
  return apiJson<{ success: boolean }>(`/api/chat/message/${id}`, {
    method: "DELETE",
  });
}

export function regenerateFromMessage(messageId: string) {
  return apiJson<{ success: boolean }>("/api/chat/regenerate", {
    method: "POST",
    json: { messageId },
  });
}

export async function generateThreadTitle(
  threadId: string,
  message: string,
  chatModel?: ChatModel,
) {
  const response = await apiFetch("/api/chat/title", {
    method: "POST",
    json: { threadId, message, chatModel },
  });

  if (!response.ok) {
    return;
  }

  await response.text();
}

export async function uploadAttachment(file: {
  uri: string;
  name: string;
  type?: string;
}): Promise<ChatAttachment> {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type || "application/octet-stream",
  } as any);

  const response = await apiFetch("/api/storage/upload", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Upload failed");
  }

  const json = await response.json();

  return {
    type: "file",
    url: json.url,
    mediaType: file.type,
    filename: file.name,
  };
}

export type ChatRequest = {
  id: string;
  message: UIMessage;
  messages?: UIMessage[];
  chatModel?: ChatModel;
  toolChoice: ToolChoice;
  attachments?: ChatAttachment[];
  instructions?: string;
  imageTool?: ImageToolChoice;
};

export function startChatRequest(
  endpoint: "/api/chat" | "/api/chat/temporary",
  body: ChatRequest,
  signal: AbortSignal,
) {
  if (endpoint === "/api/chat/temporary") {
    return apiFetch(endpoint, {
      method: "POST",
      signal,
      json: {
        messages: body.messages || [body.message],
        chatModel: body.chatModel,
        instructions: body.instructions,
      },
    });
  }

  return apiFetch(endpoint, {
    method: "POST",
    signal,
    json: {
      id: body.id,
      message: body.message,
      chatModel: body.chatModel,
      toolChoice: body.toolChoice,
      mentions: [],
      imageTool:
        body.imageTool && body.imageTool !== "off"
          ? { model: body.imageTool }
          : undefined,
      allowedAppDefaultToolkit: [],
      attachments: body.attachments || [],
    },
  });
}
