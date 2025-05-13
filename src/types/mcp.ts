import { z } from "zod";

export const MCPSseConfigZodSchema = z.object({
  url: z.string().url().describe("The URL of the SSE endpoint"),
  headers: z.record(z.string(), z.string()).optional(),
});

export const MCPStdioConfigZodSchema = z.object({
  command: z.string().min(1).describe("The command to run"),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export const AllowedMCPServerZodSchema = z.object({
  tools: z.array(z.string()),
  // resources: z.array(z.string()).optional(),
});

export type AllowedMCPServer = z.infer<typeof AllowedMCPServerZodSchema>;

export type MCPSseConfig = z.infer<typeof MCPSseConfigZodSchema>;
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigZodSchema>;

export type MCPServerConfig = MCPSseConfig | MCPStdioConfig;

export type MCPToolInfo = {
  name: string;
  description: string;
  inputSchema?: {
    type?: any;
    properties?: Record<string, any>;
    required?: string[];
  };
};

export type MCPPromptArgumentInfo = {
  name: string;
  description?: string;
  required: boolean;
};

export type MCPPromptInfo = {
  name: string;
  description: string;
  arguments: MCPPromptArgumentInfo[];
};

export type MCPPrompt = {
  name: string;
  description: string;
  execute: (args: Record<string, any>) => Promise<any>;
};

export type MCPServerInfo = {
  name: string;
  config: MCPServerConfig;
  error?: unknown;
  status: "connected" | "disconnected" | "loading";
  toolInfo: MCPToolInfo[];
  promptInfo?: MCPPromptInfo[];
};
