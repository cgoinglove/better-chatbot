import {
  VercelAIMcpToolTag,
  type MCPConnectionStatus,
  type MCPServerConfig,
  type MCPToolInfo,
  type McpServerInsert,
  type McpServerSelect,
  type VercelAIMcpTool,
} from "app-types/mcp";
import { createMCPClient, type MCPClient } from "./create-mcp-client";
import {
  errorToString,
  generateUUID,
  Locker,
  safeJSONParse,
  toAny,
} from "lib/utils";
import { safe } from "ts-safe";
import { createMCPToolId } from "./mcp-tool-id";
import globalLogger from "logger";
import { jsonSchema, ToolCallOptions } from "ai";
import { createMemoryMCPConfigStorage } from "./memory-mcp-config-storage";
import { colorize } from "consola/utils";

export type MCPUserContext = {
  userId: string;
  servers: McpServerSelect[];
};

type TextToolContent = {
  type: "text";
  text: string;
};

function isTextToolContent(content: unknown): content is TextToolContent {
  return (
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    "text" in content &&
    content.type === "text" &&
    typeof content.text === "string"
  );
}

/**
 * Interface for storage of MCP server configurations.
 * Implementations should handle persistent storage of server configs.
 *
 * IMPORTANT: When implementing this interface, be aware that:
 * - Storage can be modified externally (e.g., file edited manually)
 * - Concurrent modifications may occur from multiple processes
 * - Implementations should either handle these scenarios or document limitations
 */
export interface MCPConfigStorage {
  init(manager: MCPClientsManager): Promise<void>;
  loadAll(): Promise<McpServerSelect[]>;
  save(server: McpServerInsert): Promise<McpServerSelect>;
  delete(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
  get(id: string): Promise<McpServerSelect | null>;
  updateToolInfo?(id: string, toolInfo: MCPToolInfo[]): Promise<void>;
  updateConnectionStatus?(
    id: string,
    status: MCPConnectionStatus,
  ): Promise<void>;
}

export class MCPClientsManager {
  protected clients = new Map<
    string,
    {
      client: MCPClient;
      name: string;
    }
  >();
  private initializedLock = new Locker();
  private initialized = false;
  private logger = globalLogger.withDefaults({
    message: colorize("dim", `[${generateUUID().slice(0, 4)}] MCP Manager: `),
  });

  // Optional storage for persistent configurations
  constructor(
    private storage: MCPConfigStorage = createMemoryMCPConfigStorage(),
    private autoDisconnectSeconds: number = 60 * 30, // 30 minutes
  ) {
    process.on("SIGINT", this.cleanup.bind(this));
    process.on("SIGTERM", this.cleanup.bind(this));
  }

  private async waitInitialized() {
    if (this.initialized) {
      return;
    }
    if (this.initializedLock.isLocked) {
      await this.initializedLock.wait();
      return;
    }
    await this.init();
  }

  async init() {
    this.logger.info("Initializing MCP clients manager");
    if (this.initializedLock.isLocked) {
      this.logger.info(
        "MCP clients manager already initialized, waiting for lock",
      );
      return this.initializedLock.wait();
    }
    if (this.initialized) {
      this.logger.info("MCP clients manager already initialized");
      return;
    }
    return safe(() => this.initializedLock.lock())
      .ifOk(async () => {
        if (this.storage) {
          await this.storage.init(this);
          const configs = await this.storage.loadAll();
          await Promise.all(
            configs.map((server) => {
              const { id, name, config, toolInfo, lastConnectionStatus } =
                server;
              if (server.perUserAuth) {
                this.logger.info(
                  `Skipping global client for per-user MCP server ${name}`,
                );
                return Promise.resolve();
              }
              if (toolInfo?.length) {
                this.logger.info(
                  `Loading cached tool info for ${name} (${toolInfo.length} tools)`,
                );
                this.addClientWithCachedToolInfo(server);
                return Promise.resolve();
              }
              // Register errored servers without connecting
              // — user can manually refresh these from the UI
              if (lastConnectionStatus === "error") {
                this.logger.info(
                  `Registering ${name} without connect (last status: error)`,
                );
                this.addClientWithCachedToolInfo(server);
                return Promise.resolve();
              }
              // New servers or servers without cache — connect in background
              return this.addClient(id, name, config).catch(() => {
                `ignore error`;
              });
            }),
          );
        }
      })
      .watch(() => {
        this.initializedLock.unlock();
        this.initialized = true;
      })
      .unwrap();
  }

  /**
   * Returns all tools from all clients as a flat object
   */
  async tools(
    context: MCPUserContext,
  ): Promise<Record<string, VercelAIMcpTool>> {
    await this.ensureClientsForContext(context);

    const tools: Record<string, VercelAIMcpTool> = {};

    for (const config of context.servers) {
      const { id, name, toolInfo: storedToolInfo } = config;
      const clientId = this.getClientIdForServer(config, context.userId);
      const client = this.clients.get(clientId);

      const toolInfo =
        client?.client?.toolInfo && client.client.toolInfo.length > 0
          ? client.client.toolInfo
          : storedToolInfo || [];

      if (!toolInfo.length) continue;

      const clientName = name;
      for (const tool of toolInfo) {
        tools[createMCPToolId(clientName, tool.name)] =
          VercelAIMcpToolTag.create({
            description: tool.description,
            inputSchema: jsonSchema(
              toAny({
                ...tool.inputSchema,
                properties: tool.inputSchema?.properties ?? {},
                additionalProperties: false,
              }),
            ),
            _originToolName: tool.name,
            _mcpServerName: clientName,
            _mcpServerId: id,
            execute: (params, options: ToolCallOptions) => {
              options?.abortSignal?.throwIfAborted();
              return this.toolCall(id, tool.name, params, context);
            },
          });
      }
    }

    return tools;
  }
  /**
   * Creates a client with cached tool info but does NOT connect.
   * The connection will happen lazily when a tool is actually called.
   */
  private addClientWithCachedToolInfo(
    server: McpServerSelect,
    userId?: string,
  ) {
    const clientId = this.getClientIdForServer(server, userId);
    if (this.clients.has(clientId)) {
      const prevClient = this.clients.get(clientId)!;
      void prevClient.client.disconnect();
    }
    const client = createMCPClient(server.id, server.name, server.config, {
      autoDisconnectSeconds: this.autoDisconnectSeconds,
      initialToolInfo: server.toolInfo ?? [],
      userId,
      perUserAuth: server.perUserAuth,
      onToolInfoUpdate: (toolInfo) => {
        this.storage?.updateToolInfo?.(server.id, toolInfo);
      },
      onConnectionStatusChange: (status) => {
        this.storage?.updateConnectionStatus?.(server.id, status);
      },
    });
    this.clients.set(clientId, { client, name: server.name });
  }

  async ensureClientsForContext(context: MCPUserContext) {
    await this.waitInitialized();
    await Promise.allSettled(
      context.servers.map(async (server) => {
        const clientId = this.getClientIdForServer(server, context.userId);
        if (this.clients.has(clientId)) return;

        if (
          server.toolInfo?.length ||
          (!server.perUserAuth && server.lastConnectionStatus === "error")
        ) {
          this.addClientWithCachedToolInfo(server, context.userId);
          return;
        }

        if (server.perUserAuth) {
          return;
        }

        await this.addClient(
          server.id,
          server.name,
          server.config,
          context.userId,
        ).catch(() => {
          `ignore error`;
        });
      }),
    );
  }

  /**
   * Creates and adds a new client instance to memory only (no storage persistence)
   */
  async addClient(
    id: string,
    name: string,
    serverConfig: MCPServerConfig,
    userId?: string,
  ) {
    const server = await this.storage.get(id);
    const clientId = server ? this.getClientIdForServer(server, userId) : id;
    if (this.clients.has(clientId)) {
      const prevClient = this.clients.get(clientId)!;
      void prevClient.client.disconnect();
    }
    const client = createMCPClient(id, name, serverConfig, {
      autoDisconnectSeconds: this.autoDisconnectSeconds,
      userId,
      perUserAuth: server?.perUserAuth ?? false,
      onToolInfoUpdate: (toolInfo) => {
        this.storage?.updateToolInfo?.(id, toolInfo);
      },
      onConnectionStatusChange: (status) => {
        this.storage?.updateConnectionStatus?.(id, status);
      },
    });
    this.clients.set(clientId, { client, name });
    return client.connect();
  }

  /**
   * Persists a new client configuration to storage and adds the client instance to memory
   */
  async persistClient(server: McpServerInsert) {
    const entity = await this.storage.save(server);
    await this.addClient(
      entity.id,
      entity.name,
      entity.config,
      entity.userId,
    ).catch((err) => {
      if (!server.id) {
        void this.removeClient(entity.id);
      }
      throw err;
    });

    const clientId = this.getClientIdForServer(entity, entity.userId);
    return this.clients.get(clientId)!;
  }

  /**
   * Removes a client by name, disposing resources and removing from storage
   */
  async removeClient(id: string) {
    if (this.storage) {
      if (await this.storage.has(id)) {
        await this.storage.delete(id);
      }
    }
    this.disconnectServer(id);
  }

  async disconnectClient(id: string) {
    const client = this.clients.get(id);
    this.clients.delete(id);
    if (client) {
      void client.client.disconnect();
    }
  }

  async disconnectServer(id: string) {
    const clientIds = Array.from(this.clients.keys()).filter(
      (clientId) => clientId === id || clientId.startsWith(`${id}:`),
    );
    await Promise.allSettled(
      clientIds.map((clientId) => this.disconnectClient(clientId)),
    );
  }

  /**
   * Refreshes an existing client with a new configuration or its existing config
   */
  async refreshClient(id: string, context: MCPUserContext) {
    await this.waitInitialized();
    const server = this.requireAccessibleServer(context, id);
    this.logger.info(
      `Refreshing client ${server.name} for user ${context.userId}`,
    );
    await this.addClient(id, server.name, server.config, context.userId);
    const clientId = this.getClientIdForServer(server, context.userId);
    return this.clients.get(clientId)!;
  }

  async cleanup() {
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    await Promise.allSettled(clients.map(({ client }) => client.disconnect()));
  }

  async getClients(context: MCPUserContext) {
    await this.waitInitialized();
    const result: {
      id: string;
      clientId: string;
      client: MCPClient;
      name: string;
    }[] = [];

    for (const config of context.servers) {
      const clientId = this.getClientIdForServer(config, context.userId);
      const client = this.clients.get(clientId);
      if (client) {
        result.push({
          id: config.id,
          clientId,
          client: client.client,
          name: client.name,
        });
      }
    }

    return result;
  }

  private getClientIdForServer(server: McpServerSelect, userId?: string) {
    if (!server.perUserAuth) {
      return server.id;
    }
    if (!userId) {
      throw new Error(
        `MCP server ${server.id} requires authenticated user context`,
      );
    }
    return `${server.id}:${userId}`;
  }

  private requireAccessibleServer(context: MCPUserContext, id: string) {
    const server = context.servers.find((s) => s.id === id);
    if (!server) {
      throw new Error(`MCP server ${id} is not accessible`);
    }
    return server;
  }

  async getClient(id: string, context: MCPUserContext) {
    await this.waitInitialized();
    const server = this.requireAccessibleServer(context, id);

    const clientId = this.getClientIdForServer(server, context.userId);

    const client = this.clients.get(clientId);
    if (!client) {
      await this.addClient(id, server.name, server.config, context.userId);
    }

    return this.clients.get(clientId);
  }
  async toolCallByServerName(
    serverName: string,
    toolName: string,
    input: unknown,
    context: MCPUserContext,
  ) {
    const server = context.servers.find((s) => s.name === serverName);
    if (!server) {
      throw new Error(`MCP server ${serverName} is not accessible`);
    }
    return this.toolCall(server.id, toolName, input, context);
  }
  async toolCall(
    id: string,
    toolName: string,
    input: unknown,
    context: MCPUserContext,
  ) {
    return safe(() => this.getClient(id, context))
      .map((client) => {
        if (!client) throw new Error(`Client ${id} not found`);
        return client.client;
      })
      .map((client) => client.callTool(toolName, input))
      .map((res) => {
        if (res?.content && Array.isArray(res.content)) {
          const parsedResult = {
            ...res,
            content: res.content.map((c: unknown) => {
              if (isTextToolContent(c)) {
                const parsed = safeJSONParse(c.text);
                return {
                  ...c,
                  type: "text",
                  text: parsed.success ? parsed.value : c.text,
                };
              }
              return c;
            }),
          };
          return parsedResult;
        }
        return res;
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

export function createMCPClientsManager(
  storage?: MCPConfigStorage,
  autoDisconnectSeconds: number = 60 * 30, // 30 minutes
): MCPClientsManager {
  return new MCPClientsManager(storage, autoDisconnectSeconds);
}
