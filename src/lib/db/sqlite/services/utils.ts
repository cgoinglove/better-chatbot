import { UIMessage } from "ai";
import { ChatMessage, ChatThread, Project } from "app-types/chat";
import { MCPServerBinding, MCPServerBindingConfig } from "app-types/mcp";

export const convertToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

export const convertToTimestamp = (date: Date): number => {
  return date.getTime();
};

export const convertToChatThread = (row: {
  id: string;
  createdAt: number;
  title: string;
  userId: string;
  projectId: string | null;
}): ChatThread => {
  return {
    id: row.id,
    createdAt: convertToDate(row.createdAt),
    title: row.title,
    userId: row.userId,
    projectId: row.projectId,
  };
};

export const convertToProject = (row: {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  userId: string;
  instructions?: string | null;
}): Project => {
  return {
    id: row.id,
    createdAt: convertToDate(row.createdAt),
    updatedAt: convertToDate(row.updatedAt),
    name: row.name,
    userId: row.userId,
    instructions: row.instructions ? JSON.parse(row.instructions) : [],
  };
};

export const convertToChatMessage = (row: {
  id: string;
  createdAt: number;
  threadId: string;
  role: string;
  parts: string;
  attachments: string | null;
  annotations: string | null;
  model: string | null;
}): ChatMessage => {
  return {
    id: row.id,
    createdAt: convertToDate(row.createdAt),
    threadId: row.threadId,
    role: row.role as UIMessage["role"],
    parts: JSON.parse(row.parts) as UIMessage["parts"],
    attachments: row.attachments ? JSON.parse(row.attachments) : [],
    model: row.model,
    annotations: row.annotations ? JSON.parse(row.annotations) : [],
  };
};

export const convertToMcpServerBinding = (row: {
  ownerType: string;
  ownerId: string;
  config: string;
}): MCPServerBinding => {
  return {
    ownerType: row.ownerType as MCPServerBinding["ownerType"],
    ownerId: row.ownerId,
    config: JSON.parse(row.config) as MCPServerBindingConfig,
  };
};
