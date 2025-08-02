import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  type MCPServerInfo,
  MCPRemoteConfigZodSchema,
  MCPStdioConfigZodSchema,
  type MCPServerConfig,
  type MCPToolInfo,
} from "app-types/mcp";
import { jsonSchema, Tool, tool, ToolExecutionOptions } from "ai";
import { isMaybeRemoteConfig, isMaybeStdioConfig } from "./is-mcp-config";
import logger from "logger";
import type { ConsolaInstance } from "consola";
import { colorize } from "consola/utils";
import {
  createDebounce,
  errorToString,
  isNull,
  Locker,
  toAny,
  withTimeout,
} from "lib/utils";

import { safe } from "ts-safe";
import {
  IS_EDGE_RUNTIME,
  IS_MCP_SERVER_REMOTE_ONLY,
  IS_VERCEL_ENV,
} from "lib/const";

type ClientOptions = {
  autoDisconnectSeconds?: number;
};

const CONNET_TIMEOUT = IS_VERCEL_ENV ? 15000 : 120000;

/**
 * Client class for Model Context Protocol (MCP) server connections
 */
export class MCPClient {
  private client?: Client;
  private error?: unknown;
  private isConnected = false;
  private log: ConsolaInstance;
  private locker = new Locker();
  // Information about available tools from the server
  toolInfo: MCPToolInfo[] = [];
  // Tool instances that can be used for AI functions
  tools: { [key: string]: Tool } = {};

  constructor(
    private name: string,
    private serverConfig: MCPServerConfig,
    private options: ClientOptions = {},
    private disconnectDebounce = createDebounce(),
  ) {
    this.log = logger.withDefaults({
      message: colorize(
        "cyan",
        `${IS_EDGE_RUNTIME ? "[EdgeRuntime] " : " "}MCP Client ${this.name}: `,
      ),
    });
  }

  getInfo(): MCPServerInfo {
    return {
      name: this.name,
      config: this.serverConfig,
      status: this.locker.isLocked
        ? "loading"
        : this.isConnected
          ? "connected"
          : "disconnected",
      error: this.error,
      toolInfo: this.toolInfo,
    };
  }

  private scheduleAutoDisconnect() {
    if (this.options.autoDisconnectSeconds) {
      this.disconnectDebounce(() => {
        this.disconnect();
      }, this.options.autoDisconnectSeconds * 1000);
    }
  }

  /**
   * Connect to the MCP server
   * Do not throw Error
   * @returns this
   */
  async connect() {
    if (IS_EDGE_RUNTIME) {
      this.log.warn(`Edge runtime is not supported for this operation.`);
      return;
    }
    if (this.locker.isLocked) {
      await this.locker.wait();
      return this.client;
    }
    if (this.isConnected) {
      return this.client;
    }
    try {
      const startedAt = Date.now();
      this.locker.lock();

      const client = new Client({
        name: "better-chatbot",
        version: "1.0.0",
      });

      // Create appropriate transport based on server config type
      if (isMaybeStdioConfig(this.serverConfig)) {
        // Skip stdio transport
        if (IS_MCP_SERVER_REMOTE_ONLY) {
          throw new Error("VERCEL: Stdio transport is not supported");
        }

        const config = MCPStdioConfigZodSchema.parse(this.serverConfig);
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          // Merge process.env with config.env, ensuring PATH is preserved and filtering out undefined values
          env: Object.entries({ ...process.env, ...config.env }).reduce(
            (acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, string>,
          ),
          cwd: process.cwd(),
        });

        await withTimeout(client.connect(transport), CONNET_TIMEOUT);
      } else if (isMaybeRemoteConfig(this.serverConfig)) {
        const config = MCPRemoteConfigZodSchema.parse(this.serverConfig);
        const abortController = new AbortController();
        const url = new URL(config.url);
        try {
          const transport = new StreamableHTTPClientTransport(url, {
            requestInit: {
              headers: config.headers,
              signal: abortController.signal,
            },
          });
          await withTimeout(client.connect(transport), CONNET_TIMEOUT);
        } catch (streamableHttpError) {
          this.log.error(streamableHttpError);
          this.log.warn(
            "Streamable HTTP connection failed, falling back to SSE transport",
          );
          const transport = new SSEClientTransport(url, {
            requestInit: {
              headers: config.headers,
              signal: abortController.signal,
            },
          });
          await withTimeout(client.connect(transport), CONNET_TIMEOUT);
        }
      } else {
        throw new Error("Invalid server config");
      }
      this.log.info(
        `Connected to MCP server in ${((Date.now() - startedAt) / 1000).toFixed(2)}s`,
      );
      this.isConnected = true;
      this.error = undefined;
      this.client = client;
      const toolResponse = await client.listTools();
      this.toolInfo = toolResponse.tools.map(
        (tool) =>
          ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          }) as MCPToolInfo,
      );

      // Create AI SDK tool wrappers for each MCP tool
      this.tools = toolResponse.tools.reduce((prev, _tool) => {
        const parameters = jsonSchema(
          toAny({
            ..._tool.inputSchema,
            properties: _tool.inputSchema.properties ?? {},
            additionalProperties: false,
          }),
        );
        prev[_tool.name] = tool({
          parameters,
          description: _tool.description,
          execute: (params, options: ToolExecutionOptions) => {
            options?.abortSignal?.throwIfAborted();
            return this.callTool(_tool.name, params);
          },
        });
        return prev;
      }, {});
      this.scheduleAutoDisconnect();
    } catch (error) {
      this.log.error(error);
      this.isConnected = false;
      this.error = error;
    }

    this.locker.unlock();
    return this.client;
  }
  async disconnect() {
    this.log.info("Disconnecting from MCP server");
    await this.locker.wait();
    this.isConnected = false;
    const client = this.client;
    this.client = undefined;
    void client?.close().catch((e) => this.log.error(e));
  }
  async callTool(toolName: string, input?: unknown) {
    const execute = async () => {
      const client = await this.connect();
      return client?.callTool({
        name: toolName,
        arguments: input as Record<string, unknown>,
      });
    };
    return safe(() => this.log.info("tool call", toolName))
      .ifOk(() => this.scheduleAutoDisconnect()) // disconnect if autoDisconnectSeconds is set
      .map(() => execute())
      .ifFail(async (err) => {
        if (err?.message?.includes("Transport is closed")) {
          this.log.info("Transport is closed, reconnecting...");
          await this.disconnect();
          return execute();
        }
        throw err;
      })
      .ifOk((v) => {
        if (isNull(v)) {
          throw new Error("Tool call failed with null");
        }
        return v;
      })
      .ifOk(() => this.scheduleAutoDisconnect())
      .watch((status) => {
        if (!status.isOk) {
          this.log.error("Tool call failed", toolName, status.error);
        } else if (status.value?.isError) {
          this.log.error(
            "Tool call failed content",
            toolName,
            status.value.content,
          );
        }
      })
      .ifFail((err) => {
        return {
          isError: true,
          error: {
            message: errorToString(err),
            name: err?.name || "ERROR",
          },
          content: [],
        };
      })
      .unwrap();
  }
}

/**
 * Factory function to create a new MCP client
 */
export const createMCPClient = (
  name: string,
  serverConfig: MCPServerConfig,
  options: ClientOptions = {},
): MCPClient => new MCPClient(name, serverConfig, options);
