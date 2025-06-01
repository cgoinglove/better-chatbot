import {
  type MCPServerInfo,
  type SimpleHttpMCPConfig,
  type MCPToolInfo,
} from "app-types/mcp";
import { type Tool, tool, jsonSchema } from "ai";
import logger from "logger"; // Assuming a logger instance
import { colorize } from "consola/utils"; // For colored logging
import { type ConsolaInstance } from "consola";

// Basic utility functions (if not available or different in lib/utils)
const 안전한_JSON_파싱 = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch (e) {
    // If parsing fails, it might not be JSON, or malformed.
    // Depending on expected non-JSON responses, you might return the text itself.
    // For this client, we generally expect JSON from the MCP.
    logger.warn("Failed to parse JSON response:", text);
    return { error: "Invalid JSON response", details: text }; // Or throw an error
  }
};

const 에러_문자열로 = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// Helper function to make HTTP requests (using fetch)
async function makeHttpRequest(url: string, method: string, headers?: Record<string, string>, body?: any) {
  const log = logger.withDefaults({ message: colorize("cyan", "makeHttpRequest: ") });
  log.info(`Request: ${method} ${url}`);
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text(); // Get text first to avoid issues with empty body

    if (!response.ok) {
      log.error(`HTTP error ${response.status} for ${method} ${url}: ${responseText || response.statusText}`);
      throw new Error(`HTTP error ${response.status}: ${responseText || response.statusText}`);
    }

    // Handle cases where response might be empty (e.g., 204 No Content)
    return responseText ? 안전한_JSON_파싱(responseText) : null;
  } catch (error) {
    log.error(`Exception during HTTP request to ${url}:`, error);
    // Re-throw or handle as needed
    throw error;
  }
}


export class SimpleHttpClient {
  private clientName: string;
  private config: SimpleHttpMCPConfig;
  private log: ConsolaInstance;
  public toolInfo: MCPToolInfo[] = [];
  public tools: { [key: string]: Tool } = {};
  private status: "connected" | "disconnected" | "loading" = "disconnected";
  private currentError?: unknown;

  constructor(name: string, serverConfig: SimpleHttpMCPConfig) {
    this.clientName = name;
    this.config = serverConfig;
    this.log = logger.withDefaults({
      message: colorize("magenta", `SimpleHttpMCPClient ${this.clientName}: `),
    });
    this.status = "disconnected";
    this.log.info("Client created.");
  }

  getInfo(): MCPServerInfo {
    return {
      name: this.clientName,
      config: this.config,
      status: this.status,
      error: this.currentError,
      toolInfo: this.toolInfo,
    };
  }

  async connect(): Promise<void> {
    this.log.info("Connecting (initializing tools from static config)...");
    this.status = "loading";
    try {
      // Deep copy tool definitions to avoid modifying the original config
      this.toolInfo = this.config.tools.map(toolDef => ({ ...toolDef, inputSchema: toolDef.inputSchema ? {...toolDef.inputSchema} : undefined }));

      this.tools = this.toolInfo.reduce((acc, ti) => {
        const parameters = ti.inputSchema ? jsonSchema(ti.inputSchema as any) : jsonSchema({type: 'object', properties: {}});

        acc[ti.name] = tool({
          description: ti.description,
          parameters: parameters,
          execute: async (args: any) => {
            this.log.info(`Executing tool: ${ti.name} with args:`, args);
            return this.callTool(ti.name, args);
          },
        });
        return acc;
      }, {} as { [key: string]: Tool });

      this.status = "connected";
      this.currentError = undefined;
      this.log.info(`Initialized ${this.toolInfo.length} tools from static configuration.`);
    } catch (error) {
      this.log.error("Failed to initialize tools from static config:", 에러_문자열로(error));
      this.status = "disconnected";
      this.currentError = error;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.log.info("Disconnecting (no-op for simple HTTP client).");
    this.status = "disconnected";
    // No actual connection to tear down
  }

  async callTool(toolName: string, input?: unknown): Promise<any> {
    this.log.info(`Calling tool: ${toolName}`);
    if (this.status !== "connected") {
      this.log.warn(`Tool call attempted while status is ${this.status}. Attempting to connect.`);
      // Removed automatic connect attempt to avoid potential loops if connect keeps failing.
      // Connection should be managed explicitly by the caller or MCPClientsManager.
      throw new Error(`Client not connected. Current status: ${this.status}. Last error: ${this.currentError ? 에러_문자열로(this.currentError) : 'Unknown'}`);
    }

    const toolDefinition = this.config.tools.find(t => t.name === toolName);
    if (!toolDefinition) {
      this.log.error(`Tool ${toolName} not defined in static configuration.`);
      throw new Error(`Tool ${toolName} not defined for this client.`);
    }

    const requestBody = {
      toolName: toolName, // Some MCPs might expect this in the body
      parameters: input,
    };

    try {
      // The `url` in SimpleHttpMCPConfig is the full executable URL for the MCP server
      const result = await makeHttpRequest(this.config.url, 'POST', this.config.headers, requestBody);

      // Assuming the remote MCP returns a structure like:
      // { success: boolean, toolName: string, result: any, error?: string, details?: any }
      // or simply the direct result if success=true, or an error object if success=false.
      if (result && typeof result === 'object' && result.success === false) {
        this.log.error(`Tool execution failed on remote MCP server for ${toolName}:`, result.error, result.details);
        throw new Error(result.error || `Tool execution failed for ${toolName} on remote server.`);
      }

      // If the response has a `result` field (as per the Jira example), use that.
      // Otherwise, assume the entire response is the result.
      if (result && typeof result === 'object' && 'result' in result) {
        return result.result;
      }
      return result; // Return the direct result if no specific structure is matched

    } catch (error) {
      this.log.error(`Error calling tool ${toolName}:`, 에러_문자열로(error));
      throw error;
    }
  }
}

// Factory function
export const createSimpleHttpClient = (
  name: string,
  serverConfig: SimpleHttpMCPConfig,
): SimpleHttpClient => {
  return new SimpleHttpClient(name, serverConfig);
};
