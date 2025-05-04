import { createFileBasedMCPConfigsStorage } from "lib/ai/mcp/fb-mcp-config-storage";
import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "lib/ai/mcp/create-mcp-clients-manager";

declare global {
  // eslint-disable-next-line no-var
  var __mcpClientsManager__: MCPClientsManager | undefined;
}

const storage = createFileBasedMCPConfigsStorage();

let mcpClientsManager: MCPClientsManager;

if (!process.env.MCP_NO_INITIAL) {
  if (!globalThis.__mcpClientsManager__) {
    globalThis.__mcpClientsManager__ = createMCPClientsManager(storage);
    await globalThis.__mcpClientsManager__.init();
  }
  mcpClientsManager = globalThis.__mcpClientsManager__;
}

export { mcpClientsManager };
