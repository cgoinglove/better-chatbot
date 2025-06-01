import { z } from "zod";

// Schema for MCPToolInfo
export const MCPToolInfoZodSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z
    .object({
      type: z.string().optional(),
      properties: z.record(z.any()).optional(),
      required: z.array(z.string()).optional(),
    })
    .passthrough() // Allows other properties in inputSchema
    .optional(),
});

// Existing schemas modified to include the 'protocol' for discriminated union
export const MCPSseConfigZodSchema = z.object({
  protocol: z.literal('sse'),
  name: z.string().optional().describe("Optional name for the MCP server instance"),
  description: z.string().optional().describe("Optional description for the MCP server instance"),
  url: z.string().url().describe("The URL of the SSE endpoint"),
  headers: z.record(z.string()).optional(), // Value type changed to z.string() for broader compatibility
});

export const MCPStdioConfigZodSchema = z.object({
  protocol: z.literal('stdio'),
  name: z.string().optional().describe("Optional name for the MCP server instance"),
  description: z.string().optional().describe("Optional description for the MCP server instance"),
  command: z.string().min(1).describe("The command to run"),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(), // Value type changed to z.string()
});

// New schema for SimpleHttpMCPConfig
export const SimpleHttpMCPConfigZodSchema = z.object({
  protocol: z.literal('simple-http'),
  name: z.string().optional().describe("Optional name for the MCP server instance"),
  description: z.string().optional().describe("Optional description for the MCP server instance"),
  url: z.string().url().describe("The full URL to the HTTP endpoint (e.g., an AWS Lambda function URL for /mcp/execute)"),
  headers: z.record(z.string()).optional(),
  tools: z.array(MCPToolInfoZodSchema).describe("Static list of tools provided by this simple HTTP MCP"),
});

// Zod schema for the discriminated union
export const MCPServerConfigZodSchema = z.discriminatedUnion("protocol", [
  MCPSseConfigZodSchema,
  MCPStdioConfigZodSchema,
  SimpleHttpMCPConfigZodSchema,
]);

// TypeScript types inferred from Zod schemas
export type MCPToolInfo = z.infer<typeof MCPToolInfoZodSchema>;
export type MCPSseConfig = z.infer<typeof MCPSseConfigZodSchema>;
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigZodSchema>;
export type SimpleHttpMCPConfig = z.infer<typeof SimpleHttpMCPConfigZodSchema>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigZodSchema>;


// Existing AllowedMCPServer schema and type (seems unrelated but kept for completeness)
export const AllowedMCPServerZodSchema = z.object({
  tools: z.array(z.string()),
  // resources: z.array(z.string()).optional(),
});
export type AllowedMCPServer = z.infer<typeof AllowedMCPServerZodSchema>;


// Existing MCPServerInfo and MCPRepository (kept for completeness, may need review for MCPServerConfig changes)
// Note: The `config: MCPServerConfig` in these types will now correctly refer to the new discriminated union.
export type MCPServerInfo = {
  name: string; // This 'name' here seems to be the unique key/id of the MCP config instance
  config: MCPServerConfig; // This now correctly refers to the discriminated union
  error?: unknown;
  status: "connected" | "disconnected" | "loading";
  toolInfo: MCPToolInfo[]; // This matches the new MCPToolInfo type
};

export interface MCPRepository {
  insertServer(server: {
    name: string; // This 'name' is likely the unique identifier for the stored config
    config: MCPServerConfig; // Updated to use the discriminated union
    enabled?: boolean;
  }): Promise<string>;
  selectServerById(id: string): Promise<{
    id: string;
    name: string;
    config: MCPServerConfig; // Updated
    enabled: boolean;
  } | null>;
  selectServerByName(name: string): Promise<{
    id: string;
    name: string;
    config: MCPServerConfig; // Updated
    enabled: boolean;
  } | null>;
  selectAllServers(): Promise<
    { id: string; name: string; config: MCPServerConfig; enabled: boolean }[] // Updated
  >;
  updateServer(
    id: string,
    data: { name?: string; config?: MCPServerConfig; enabled?: boolean }, // Updated
  ): Promise<void>;
  deleteServer(id: string): Promise<void>;
  existsServerWithName(name: string): Promise<boolean>;
}
