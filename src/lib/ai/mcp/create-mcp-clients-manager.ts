import {
  VercelAIMcpToolTag,
  type MCPServerConfig,
  type McpServerInsert,
  type McpServerSelect,
  type VercelAIMcpTool,
  type McpUserOAuthRepository,
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
import { McpServerTable } from "lib/db/pg/schema.pg";
import { createMCPToolId } from "./mcp-tool-id";
import globalLogger from "logger";
import { jsonSchema, ToolCallOptions } from "ai";
import { createMemoryMCPConfigStorage } from "./memory-mcp-config-storage";
import { colorize } from "consola/utils";

// Result type for tool calls that may require authentication
export type ToolCallResult = {
  isError?: boolean;
  requiresAuth?: boolean;
  mcpServerId?: string;
  mcpServerName?: string;
  authProvider?: string;
  error?: {
    message: string;
    name: string;
  };
  content: any[];
  structuredContent?: any;
};

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
            configs.map(({ id, name, config, userSessionAuth }) =>
              this.addClient(id, name, config, { userSessionAuth }).catch(
                () => {
                  `ignore error`;
                },
              ),
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
  async tools(): Promise<Record<string, VercelAIMcpTool>> {
    await this.waitInitialized();
    return Array.from(this.clients.entries()).reduce(
      (acc, [id, client]) => {
        if (!client.client?.toolInfo?.length) return acc;
        const clientName = client.name;
        return {
          ...acc,
          ...client.client.toolInfo.reduce(
            (bcc, tool) => {
              return {
                ...bcc,
                [createMCPToolId(clientName, tool.name)]:
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
                      return this.toolCall(id, tool.name, params);
                    },
                  }),
              };
            },
            {} as Record<string, VercelAIMcpTool>,
          ),
        };
      },
      {} as Record<string, VercelAIMcpTool>,
    );
  }
  /**
   * Creates and adds a new client instance to memory only (no storage persistence)
   * @param id - MCP server ID
   * @param name - MCP server name
   * @param serverConfig - MCP server configuration
   * @param options - Optional settings for user session authorization
   */
  async addClient(
    id: string,
    name: string,
    serverConfig: MCPServerConfig,
    options?: {
      userId?: string;
      userSessionAuth?: boolean;
    },
  ) {
    if (this.clients.has(id)) {
      const prevClient = this.clients.get(id)!;
      void prevClient.client.disconnect();
    }
    const client = createMCPClient(id, name, serverConfig, {
      autoDisconnectSeconds: this.autoDisconnectSeconds,
      userId: options?.userId,
      userSessionAuth: options?.userSessionAuth,
    });
    this.clients.set(id, { client, name });
    return client.connect();
  }

  /**
   * Persists a new client configuration to storage and adds the client instance to memory
   */
  async persistClient(server: typeof McpServerTable.$inferInsert) {
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
  async refreshClient(id: string) {
    await this.waitInitialized();
    const server = await this.storage.get(id);
    if (!server) {
      throw new Error(`Client ${id} not found`);
    }
    this.logger.info(`Refreshing client ${server.name}`);
    await this.addClient(id, server.name, server.config);
    return this.clients.get(id)!;
  }

  async cleanup() {
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    await Promise.allSettled(clients.map(({ client }) => client.disconnect()));
  }

  async getClients() {
    await this.waitInitialized();
    return Array.from(this.clients.entries()).map(([id, { client }]) => ({
      id,
      client: client,
    }));
  }
  async getClient(id: string) {
    await this.waitInitialized();
    const client = this.clients.get(id);
    if (!client) {
      await this.refreshClient(id);
    }

    return this.clients.get(id);
  }
  async toolCallByServerName(
    serverName: string,
    toolName: string,
    input: unknown,
  ) {
    const clients = await this.getClients();
    const client = clients.find((c) => c.client.getInfo().name === serverName);
    if (!client) {
      if (this.storage) {
        const servers = await this.storage.loadAll();
        const server = servers.find((s) => s.name === serverName);
        if (server) {
          return this.toolCall(server.id, toolName, input);
        }
      }
      throw new Error(`Client ${serverName} not found`);
    }
    return this.toolCall(client.id, toolName, input);
  }
  async toolCall(id: string, toolName: string, input: unknown) {
    return safe(() => this.getClient(id))
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

  /**
   * Tool call with user session context - checks if MCP server requires authorization
   * and if the user has valid tokens before executing the tool.
   *
   * User Session Authorization Management:
   * - For userSessionAuth=true (MCP SDK integrated):
   *   - The MCP client is created with userId, so the PgOAuthClientProvider
   *     automatically uses the user's session for token management
   *   - Token relay happens through the MCP SDK's OAuth flow
   *   - Each user maintains their own isolated authorization session
   *
   * - For requiresAuth=true (admin-configured):
   *   - Uses the UserSessionAuthorization table for token storage
   *   - Tokens are managed separately from MCP SDK
   *
   * @param id - MCP server ID
   * @param toolName - Name of the tool to call
   * @param input - Tool input parameters
   * @param userId - User ID for user session authorization
   * @param userOAuthRepository - Repository for checking user authorization sessions
   * @returns Tool call result or auth-required response
   */
  async toolCallWithUserAuth(
    id: string,
    toolName: string,
    input: unknown,
    userId: string,
    userOAuthRepository: McpUserOAuthRepository,
  ): Promise<ToolCallResult> {
    // Get server configuration to check authorization requirements
    const server = await this.storage.get(id);
    if (!server) {
      return {
        isError: true,
        error: {
          message: `MCP server ${id} not found`,
          name: "NOT_FOUND",
        },
        content: [],
      };
    }

    // Check if server uses User Session Authorization (MCP SDK integrated)
    // In this case, the MCP client handles auth through PgOAuthClientProvider
    // which is user-aware when userSessionAuth is enabled
    if (server.userSessionAuth) {
      this.logger.info(
        `Server ${server.name} uses User Session Authorization for user ${userId}`,
      );
      // The client was created with userId context, so MCP SDK handles token relay
      // Each user's session is isolated - just execute the tool
    }

    // Check if server requires admin-configured authorization
    if (server.requiresAuth && server.authProvider !== "none") {
      // Check if user has valid tokens in UserSessionAuthorization
      const hasValidTokens = await userOAuthRepository.hasValidTokens(
        userId,
        id,
      );

      if (!hasValidTokens) {
        this.logger.info(
          `User ${userId} needs authorization to MCP server ${server.name}`,
        );
        return {
          isError: true,
          requiresAuth: true,
          mcpServerId: id,
          mcpServerName: server.name,
          authProvider: server.authProvider,
          error: {
            message: `Authorization required for ${server.name}. Please authorize to continue.`,
            name: "AUTH_REQUIRED",
          },
          content: [
            {
              type: "text",
              text: `🔐 Authorization required for **${server.name}**. Please click the authorize button to continue.`,
            },
          ],
        };
      }

      // User has valid authorization - log and proceed
      this.logger.info(
        `User ${userId} authorized to ${server.name}, executing tool ${toolName}`,
      );
    }

    // Execute the tool call
    // For userSessionAuth servers, the MCP SDK handles token relay automatically
    // For requiresAuth servers, tokens are available but relay is handled separately
    return this.toolCall(id, toolName, input);
  }

  /**
   * Get server configuration including auth settings
   */
  async getServerConfig(id: string): Promise<McpServerSelect | null> {
    return this.storage.get(id);
  }

  /**
   * Check if a user needs to authenticate to use tools from a specific MCP server
   */
  async userNeedsAuth(
    userId: string,
    mcpServerId: string,
    userOAuthRepository: McpUserOAuthRepository,
  ): Promise<boolean> {
    const server = await this.storage.get(mcpServerId);
    if (!server) return false;

    if (!server.requiresAuth || server.authProvider === "none") {
      return false;
    }

    const hasValidTokens = await userOAuthRepository.hasValidTokens(
      userId,
      mcpServerId,
    );
    return !hasValidTokens;
  }
}

export function createMCPClientsManager(
  storage?: MCPConfigStorage,
  autoDisconnectSeconds: number = 60 * 30, // 30 minutes
): MCPClientsManager {
  return new MCPClientsManager(storage, autoDisconnectSeconds);
}
