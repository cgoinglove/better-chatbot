import { MCPServerInfo } from "app-types/mcp";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { mcpRepository } from "lib/db/repository";

export async function GET() {
  const [servers, memoryClients] = await Promise.all([
    mcpRepository.selectAll(),
    mcpClientsManager.getClients(),
  ]);

  const memoryMap = new Map(
    memoryClients.map(({ id, client }) => [id, client] as const),
  );

  const result = servers.map((server) => {
    const mem = memoryMap.get(server.id);
    const info = mem?.getInfo();
    const mcpInfo: MCPServerInfo & { id: string } = {
      id: server.id,
      name: server.name,
      config: server.config,
      status: info?.status ?? "loading",
      error: info?.error,
      toolInfo: info?.toolInfo ?? [],
    };
    return mcpInfo;
  });

  return Response.json(result);
}
