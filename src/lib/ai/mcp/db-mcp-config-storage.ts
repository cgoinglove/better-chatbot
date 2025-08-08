import type { MCPConfigStorage } from "./create-mcp-clients-manager";
import { mcpRepository } from "lib/db/repository";
import defaultLogger from "logger";

import { colorize } from "consola/utils";

const logger = defaultLogger.withDefaults({
  message: colorize("gray", ` MCP Config Storage: `),
});

export function createDbBasedMCPConfigsStorage(): MCPConfigStorage {
  // Initializes the manager with configs from the database
  async function init(): Promise<void> {}

  return {
    init,
    async loadAll() {
      try {
        const servers = await mcpRepository.selectAll();
        return servers;
      } catch (error) {
        logger.error("Failed to load MCP configs from database:", error);
        return [];
      }
    },
    async save(server) {
      try {
        return mcpRepository.save(server);
      } catch (error) {
        logger.error(
          `Failed to save MCP config "${server.name}" to database:`,
          error,
        );
        throw error;
      }
    },
    async delete(id) {
      try {
        await mcpRepository.deleteById(id);
      } catch (error) {
        logger.error(
          `Failed to delete MCP config "${id}" from database:",`,
          error,
        );
        throw error;
      }
    },
    async has(id: string): Promise<boolean> {
      try {
        const server = await mcpRepository.selectById(id);
        return !!server;
      } catch (error) {
        logger.error(`Failed to check MCP config "${id}" in database:`, error);
        return false;
      }
    },
    async get(id) {
      return mcpRepository.selectById(id);
    },
  };
}
