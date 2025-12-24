import { MCPServerInfo } from "app-types/mcp";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { mcpRepository } from "lib/db/repository";
import { getCurrentUser } from "lib/auth/permissions";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !currentUser.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [servers, memoryClients] = await Promise.all([
    mcpRepository.selectAllForUser(currentUser.id),
    mcpClientsManager.getClients(),
  ]);

  const memoryMap = new Map(
    memoryClients.map(({ id, client }) => [id, client] as const),
  );

  const addTargets = servers.filter((server) => !memoryMap.has(server.id));

  const serverIds = new Set(servers.map((s) => s.id));
  const removeTargets = memoryClients.filter(({ id }) => !serverIds.has(id));

  if (addTargets.length > 0) {
    // no need to wait for this
    Promise.allSettled(
      addTargets.map((server) => mcpClientsManager.refreshClient(server.id)),
    );
  }
  if (removeTargets.length > 0) {
    // no need to wait for this
    Promise.allSettled(
      removeTargets.map((client) =>
        mcpClientsManager.disconnectClient(client.id),
      ),
    );
  }

  const result = servers.map((server) => {
    const mem = memoryMap.get(server.id);
    const info = mem?.getInfo();
    const isOwner = server.userId === currentUser.id;
    const mcpInfo: MCPServerInfo = {
      ...server,
      // Hide config from non-owners to prevent credential exposure
      config: isOwner ? server.config : undefined,
      enabled: info?.enabled ?? true,
      status: info?.status ?? "connected",
      error: info?.error,
      toolInfo: info?.toolInfo ?? [],
    };
    return mcpInfo;
  });

  return Response.json(result);
}
