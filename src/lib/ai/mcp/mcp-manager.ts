import { createDbBasedMCPConfigsStorage } from "./db-mcp-config-storage";
import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "./create-mcp-clients-manager";
import { FILE_BASED_MCP_CONFIG } from "lib/const";
declare global {
  // eslint-disable-next-line no-var
  var __mcpClientsManager__: MCPClientsManager;
}

const createMCPConfigStorage = async () => {
  if (FILE_BASED_MCP_CONFIG) {
    const { createFileBasedMCPConfigsStorage } = await import(
      "./fb-mcp-config-storage"
    );
    return createFileBasedMCPConfigsStorage();
  }

  return createDbBasedMCPConfigsStorage();
};

if (!globalThis.__mcpClientsManager__) {
  const storage = await createMCPConfigStorage();
  globalThis.__mcpClientsManager__ = createMCPClientsManager(storage);
}

export const initMCPManager = async () => {
  return globalThis.__mcpClientsManager__.init();
};

export const mcpClientsManager = globalThis.__mcpClientsManager__;
