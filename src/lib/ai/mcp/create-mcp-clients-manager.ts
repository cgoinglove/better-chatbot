import {
  VercelAIMcpToolTag,
  type MCPServerConfig,
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
            configs.map(({ id, name, config }) =>
              this.addClient(id, name, config).catch(() => {
                `ignore error`;
              }),
            ),
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
  async tools(userId?: string): Promise<Record<string, VercelAIMcpTool>> {
    await this.waitInitialized();
    const configs = await this.storage.loadAll();

    const tools: Record<string, VercelAIMcpTool> = {};

    for (const config of configs) {
      const { id, name, toolInfo: storedToolInfo, perUserAuth } = config;
      const clientId = perUserAuth && userId ? `${id}:${userId}` : id;
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
              return this.toolCall(id, tool.name, params, userId);
            },
          });
      }
    }

    return tools;
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
    const clientId = await this.getClientId(id, userId);
    if (this.clients.has(clientId)) {
      const prevClient = this.clients.get(clientId)!;
      void prevClient.client.disconnect();
    }
    const client = createMCPClient(id, name, serverConfig, {
      autoDisconnectSeconds: this.autoDisconnectSeconds,
      userId,
      perUserAuth: server?.perUserAuth ?? false,
      onToolInfoUpdate: (toolInfo) => {
        // Only update storage if it's the main client (not per-user)
        // or if we want to share tool info across users
        void this.storage.get(id).then((server) => {
          if (server) {
            void this.storage.save({
              ...server,
              toolInfo,
            });
          }
        });
      },
    });
    this.clients.set(clientId, { client, name });
    return client.connect();
  }

  /**
   * Persists a new client configuration to storage and adds the client instance to memory
   */
  async persistClient(server: McpServerInsert) {
    let id = server.name;
    if (this.storage) {
      const entity = await this.storage.save(server);
      id = entity.id;
    }
    await this.addClient(id, server.name, server.config).catch((err) => {
      if (!server.id) {
        void this.removeClient(id);
      }
      throw err;
    });

    return this.clients.get(id)!;
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
    this.disconnectClient(id);
  }

  async disconnectClient(id: string) {
    const client = this.clients.get(id);
    this.clients.delete(id);
    if (client) {
      void client.client.disconnect();
    }
  }

  /**
   * Refreshes an existing client with a new configuration or its existing config
   */
  async refreshClient(id: string, userId?: string) {
    await this.waitInitialized();
    const server = await this.storage.get(id);
    if (!server) {
      throw new Error(`Client ${id} not found`);
    }
    this.logger.info(
      `Refreshing client ${server.name}${userId ? ` for user ${userId}` : ""}`,
    );
    await this.addClient(id, server.name, server.config, userId);
    const clientId = await this.getClientId(id, userId);
    return this.clients.get(clientId)!;
  }

  async cleanup() {
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    await Promise.allSettled(clients.map(({ client }) => client.disconnect()));
  }

  async getClients(userId?: string) {
    await this.waitInitialized();
    const configs = await this.storage.loadAll();
    const result: {
      id: string;
      clientId: string;
      client: MCPClient;
      name: string;
    }[] = [];

    for (const config of configs) {
      const clientId =
        config.perUserAuth && userId ? `${config.id}:${userId}` : config.id;
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

  private async getClientId(id: string, userId?: string) {
    const server = await this.storage.get(id);
    if (!server) {
      return id;
    }
    return server.perUserAuth && userId ? `${id}:${userId}` : id;
  }

  async getClient(id: string, userId?: string) {
    await this.waitInitialized();
    const server = await this.storage.get(id);
    if (!server) {
      throw new Error(`Client ${id} not found`);
    }

    const clientId = await this.getClientId(id, userId);

    const client = this.clients.get(clientId);
    if (!client) {
      await this.addClient(id, server.name, server.config, userId);
    }

    return this.clients.get(clientId);
  }
  async toolCallByServerName(
    serverName: string,
    toolName: string,
    input: unknown,
    userId?: string,
  ) {
    const configs = await this.storage.loadAll();
    const server = configs.find((s) => s.name === serverName);
    if (!server) {
      throw new Error(`Client ${serverName} not found`);
    }
    return this.toolCall(server.id, toolName, input, userId);
  }
  async toolCall(
    id: string,
    toolName: string,
    input: unknown,
    userId?: string,
  ) {
    return safe(() => this.getClient(id, userId))
      .map((client) => {
        if (!client) throw new Error(`Client ${id} not found`);
        return client.client;
      })
      .map((client) => client.callTool(toolName, input))
      .map((res) => {
        if (res?.content && Array.isArray(res.content)) {
          const parsedResult = {
            ...res,
            content: res.content.map((c: any) => {
              if (c?.type === "text" && c?.text) {
                const parsed = safeJSONParse(c.text);
                return {
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
