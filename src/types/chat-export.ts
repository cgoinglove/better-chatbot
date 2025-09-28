import { z } from "zod";
import { UIMessage } from "ai";
import { ChatMetadata } from "./chat";
import { TipTapMentionJsonContent } from "./util";

export type ChatExport = {
  id: string;
  title: string;
  exporterId: string;
  originalThreadId?: string;
  messages: Array<{
    id: string;
    role: UIMessage["role"];
    parts: UIMessage["parts"];
    metadata?: ChatMetadata;
  }>;
  exportedAt: Date;
  expiresAt?: Date;
};

export const ChatExportCreateSchema = z.object({
  title: z.string().min(1).max(200),
  exporterId: z.string(),
  originalThreadId: z.string().nullish(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      parts: z.any(),
      metadata: z.any().optional(),
    }),
  ),
  expiresAt: z.date().nullish(),
});

export type ChatExportComment = {
  id: string;
  exportId: string;
  authorId: string;
  parentId?: string;
  content: TipTapMentionJsonContent;
  createdAt: Date;
  updatedAt: Date;
};

export const ChatExportCommentCreateSchema = z.object({
  exportId: z.string(),
  authorId: z.string(),
  parentId: z.string().optional(),
  content: z.any() as z.ZodType<TipTapMentionJsonContent>,
});

export const ChatExportCommentUpdateSchema = z.object({
  content: z.any() as z.ZodType<TipTapMentionJsonContent>,
});

export type ChatExportWithUser = ChatExport & {
  exporterName: string | null;
  exporterImage?: string;
};

export type ChatExportCommentWithUser = ChatExportComment & {
  authorName: string;
  authorImage?: string;
  replies?: ChatExportCommentWithUser[];
};

export type ChatExportRepository = {
  insert(data: z.infer<typeof ChatExportCreateSchema>): Promise<void>;
  selectById(id: string): Promise<ChatExport | null>;
  selectByIdWithUser(id: string): Promise<ChatExportWithUser | null>;
  selectByExporterId(exporterId: string): Promise<ChatExport[]>;
  checkAccess(id: string, userId: string): Promise<boolean>;
  deleteById(id: string): Promise<void>;
  isExpired(id: string): Promise<boolean>;
  insertComment(
    data: z.infer<typeof ChatExportCommentCreateSchema>,
  ): Promise<void>;
  selectCommentsByExportId(
    exportId: string,
  ): Promise<ChatExportCommentWithUser[]>;
  checkCommentAccess(id: string, authorId: string): Promise<boolean>;
  deleteComment(id: string, authorId: string): Promise<void>;
};

export const ChatExportMessageMentionSchema = z.object({
  type: z.literal("exportMessage"),
  messageId: z.string(),
  partIndex: z.number().optional(),
});

export type ChatExportMessageMention = z.infer<
  typeof ChatExportMessageMentionSchema
>;
