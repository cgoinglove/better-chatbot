import { z } from "zod";

export const ToolCustomizationZodSchema = z.object({
  toolName: z.string().min(1),
  mcpServerName: z.string().min(1),
  customPrompt: z.string().max(8000).optional().nullable(),
  enabled: z.boolean().optional(),
});

export type ToolCustomization = {
  id: string;
  userId: string;
  toolName: string;
  mcpServerName: string;
  customPrompt?: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ToolCustomizationRepository = {
  getToolCustomization: (
    userId: string,
    toolName: string,
    mcpServerName: string,
  ) => Promise<ToolCustomization | null>;
  getUserToolCustomizations: (userId: string) => Promise<ToolCustomization[]>;
  upsertToolCustomization: (
    data: Pick<
      ToolCustomization,
      "userId" | "toolName" | "mcpServerName" | "customPrompt" | "enabled"
    >,
  ) => Promise<ToolCustomization>;
  deleteToolCustomization: (
    userId: string,
    toolName: string,
    mcpServerName: string,
  ) => Promise<void>;
};
