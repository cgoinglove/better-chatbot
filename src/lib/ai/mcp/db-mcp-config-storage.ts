import type {
  MCPClientsManager,
  MCPConfigStorage,
} from "./create-mcp-clients-manager";
import { mcpRepository } from "lib/db/repository";
import defaultLogger from "logger";
import { createDebounce } from "lib/utils";
import equal from "lib/equal";
import { colorize } from "consola/utils";
import { IS_EDGE_RUNTIME } from "lib/const";

const logger = defaultLogger.withDefaults({
  message: colorize(
    "gray",
    `${IS_EDGE_RUNTIME ? "[EdgeRuntime] " : " "}MCP Config Storage: `,
  ),
});

export function createDbBasedMCPConfigsStorage(): MCPConfigStorage {
  let manager: MCPClientsManager;

  const debounce = createDebounce();

  // Initializes the manager with configs from the database
  async function init(_manager: MCPClientsManager): Promise<void> {
    manager = _manager;
  }

  async function checkAndRefreshClients() {
    try {
      logger.info("Checking MCP clients Diff");
      const servers = await mcpRepository.selectAll();
      const dbConfigs = servers
        .map((server) => ({
          id: server.id,
          name: server.name,
          config: server.config,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      const managerConfigs = await manager
        .getClients()
        .then((clients) =>
          clients.map(({ id, client }) => {
            const info = client.getInfo();
            return {
              id: id,
              name: info.name,
              config: info.config,
            };
          }),
        )
        .then((configs) => configs.sort((a, b) => a.id.localeCompare(b.id)));

      let shouldRefresh = false;
      if (dbConfigs.length !== managerConfigs.length) {
        shouldRefresh = true;
      } else if (!equal(dbConfigs, managerConfigs)) {
        shouldRefresh = true;
      }

      if (shouldRefresh) {
        const refreshPromises = dbConfigs.map(async ({ id, name, config }) => {
          const managerConfig = await manager.getClient(id);
          if (!managerConfig) {
            logger.debug(`Adding MCP client ${name}`);
            return manager.addClient(id, name, config);
          }
          if (
            !equal(
              { name, config },
              {
                name: managerConfig.name,
                config: managerConfig.client.getInfo().config,
              },
            )
          ) {
            logger.debug(`Refreshing MCP client ${name}`);
            return manager.refreshClient(id);
          }
        });
        const deletePromises = managerConfigs
          .filter((c) => {
            const dbConfig = dbConfigs.find((c2) => c2.id === c.id);
            return !dbConfig;
          })
          .map((c) => {
            logger.debug(`Removing MCP client ${c.name}`);
            return manager.removeClient(c.id);
          });
        await Promise.allSettled([...refreshPromises, ...deletePromises]);
      }
    } catch (error) {
      logger.error("Failed to check and refresh clients:", error);
    }
  }

  setInterval(
    () => debounce(checkAndRefreshClients, 5000),
    1000 * 60 * 5,
  ).unref();

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
