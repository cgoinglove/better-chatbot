import { z } from "zod";

export const MCPRemoteConfigZodSchema = z.object({
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

export type MCPRemoteConfig = z.infer<typeof MCPRemoteConfigZodSchema>;
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigZodSchema>;

export type MCPServerConfig = MCPRemoteConfig | MCPStdioConfig;

export type MCPToolInfo = {
  name: string;
  description: string;
  inputSchema?: {
    type?: any;
    properties?: Record<string, any>;
    required?: string[];
  };
};

export type MCPServerInfo = {
  name: string;
  config: MCPServerConfig;
  error?: unknown;
  status: "connected" | "disconnected" | "loading";
  toolInfo: MCPToolInfo[];
};
export interface MCPRepository {
  insertServer(server: {
    name: string;
    config: MCPServerConfig;
    enabled?: boolean;
  }): Promise<string>;
  selectServerById(id: string): Promise<{
    id: string;
    name: string;
    config: MCPServerConfig;
    enabled: boolean;
  } | null>;
  selectServerByName(name: string): Promise<{
    id: string;
    name: string;
    config: MCPServerConfig;
    enabled: boolean;
  } | null>;
  selectAllServers(): Promise<
    { id: string; name: string; config: MCPServerConfig; enabled: boolean }[]
  >;
  updateServer(
    id: string,
    data: { name?: string; config?: MCPServerConfig; enabled?: boolean },
  ): Promise<void>;
  deleteServer(id: string): Promise<void>;
  existsServerWithName(name: string): Promise<boolean>;
}
