import type { MCPServerConfig } from "app-types/mcp";
import { createMCPClient, type MCPClient } from "./create-mcp-client";
import equal from "fast-deep-equal";
import logger from "logger";
import { createMCPToolId } from "./mcp-tool-id";
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
  loadAll(): Promise<Record<string, MCPServerConfig>>;
  save(name: string, config: MCPServerConfig): Promise<void>;
  delete(name: string): Promise<void>;
  has(name: string): Promise<boolean>;
}

export class MCPClientsManager {
  protected clients = new Map<string, MCPClient>();

  private initialized = false;

  // Optional storage for persistent configurations
  constructor(private storage?: MCPConfigStorage) {
    process.on("SIGINT", this.cleanup.bind(this));
    process.on("SIGTERM", this.cleanup.bind(this));
  }

  async init() {
    if (this.initialized) return;
    if (this.storage) {
      await this.storage.init(this);
      const configs = await this.storage.loadAll();
      await Promise.all(
        Object.entries(configs).map(([name, serverConfig]) =>
          this.addClient(name, serverConfig),
        ),
      );
    }
  }

  /**
   * Returns all tools from all clients as a flat object
   */
  tools() {
    return Object.fromEntries(
      Array.from(this.clients.values())
        .filter((client) => client.getInfo().status === "connected")
        .flatMap((client) =>
          Object.entries(client.tools).map(([name, tool]) => [
            createMCPToolId(client.getInfo().name, name),
            tool,
          ]),
        ),
    );
  }

  /**
   * Returns all prompts from all clients with server name prefix
   */
  prompts() {
    return Object.fromEntries(
      Array.from(this.clients.values())
        .filter((client) => client.getInfo().status === "connected")
        .flatMap((client) => {
          const serverInfo = client.getInfo();
          // Use promptInfo which contains the full MCPPromptInfo including arguments
          return (serverInfo.promptInfo || []).map((promptInfoItem) => [
            `${serverInfo.name}/${promptInfoItem.name}`,
            { 
              name: promptInfoItem.name,
              description: promptInfoItem.description,
              arguments: promptInfoItem.arguments, // Now arguments are included
              serverName: serverInfo.name,
              // Note: The 'execute' function is not part of MCPPromptInfo.
              // The executePrompt method on the manager handles actual execution.
            }
          ]);
        }),
    );
  }

  /**
   * Adds a new client with the given name and configuration
   */
  async addClient(name: string, serverConfig: MCPServerConfig) {
    if (this.storage) {
      if (!(await this.storage.has(name))) {
        await this.storage.save(name, serverConfig);
      }
    }
    const client = createMCPClient(name, serverConfig);
    this.clients.set(name, client);
    return client.connect();
  }

  /**
   * Removes a client by name, disposing resources and removing from storage
   */
  async removeClient(name: string) {
    if (this.storage) {
      if (await this.storage.has(name)) {
        await this.storage.delete(name);
      }
    }
    const client = this.clients.get(name);
    this.clients.delete(name);
    if (client) {
      await client.disconnect();
    }
  }

  /**
   * Refreshes an existing client with a new configuration or its existing config
   */
  async refreshClient(name: string, updateConfig?: MCPServerConfig) {
    const prevClient = this.clients.get(name);
    if (!prevClient) {
      throw new Error(`Client ${name} not found`);
    }

    const currentConfig = prevClient.getInfo().config;
    const config = updateConfig ?? currentConfig;

    if (this.storage && config && !equal(currentConfig, config)) {
      await this.storage.save(name, config);
    }
    await prevClient.disconnect().catch((error) => {
      logger.error(`Error disposing client ${name}:`, error);
    });
    return this.addClient(name, config);
  }

  async cleanup() {
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    return Promise.all(clients.map((client) => client.disconnect()));
  }

  getClients() {
    return Array.from(this.clients.values());
  }
  
  /**
   * Execute a prompt from a specific MCP server
   */
  async executePrompt(serverName: string, promptName: string, args: Record<string, any>) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server "${serverName}" not found`);
    }
    
    if (!client.prompts[promptName]) {
      throw new Error(`Prompt "${promptName}" not found in server "${serverName}"`);
    }
    
    return client.prompts[promptName].execute(args);
  }
}

export function createMCPClientsManager(
  storage?: MCPConfigStorage,
): MCPClientsManager {
  return new MCPClientsManager(storage);
}
