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

export type MCPServerInfo = {
  name: string;
  config: MCPServerConfig;
  error?: unknown;
  status: "connected" | "disconnected" | "loading";
  toolInfo: MCPToolInfo[];
};

// export type McpService = {
//   selectServers: () => Promise<McpServerEntity[]>;
//   insertServer: (server: {
//     name: string;
//     config: MCPServerConfig;
//     enabled?: boolean;
//   }) => Promise<McpServerEntity>;
//   updateServer: (server: {
//     id: string;
//     name?: string;
//     config?: MCPServerConfig;
//     enabled?: boolean;
//   }) => Promise<McpServerEntity>;
//   deleteServer: (id: string) => Promise<void>;
// };
