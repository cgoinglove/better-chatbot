import { MCPServerInfo } from "app-types/mcp";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { mcpOAuthRepository, mcpRepository } from "lib/db/repository";
import { getCurrentUser } from "lib/auth/permissions";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !currentUser.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const servers = await mcpRepository.selectAllForUser(currentUser.id);
  const memoryClientsBefore = await mcpClientsManager.getClients(
    currentUser.id,
  );

  const memoryMap = new Map(
    memoryClientsBefore.map(({ id, client }) => [id, client] as const),
  );

  const addTargets = servers.filter((server) => !memoryMap.has(server.id));

  const serverIds = new Set(servers.map((s) => s.id));
  const removeTargets = memoryClientsBefore.filter(
    ({ id }) => !serverIds.has(id),
  );

  if (addTargets.length > 0) {
    await Promise.allSettled(
      addTargets.map((server) =>
        mcpClientsManager.refreshClient(server.id, currentUser.id),
      ),
    );
  }
  if (removeTargets.length > 0) {
    await Promise.allSettled(
      removeTargets.map((client) =>
        mcpClientsManager.disconnectClient(client.clientId),
      ),
    );
  }

  // Fetch again to get updated statuses
  const memoryClients = await mcpClientsManager.getClients(currentUser.id);
  const updatedMemoryMap = new Map(
    memoryClients.map(({ id, client }) => [id, client] as const),
  );

  // Check authorization status for per-user auth servers
  const authStatuses = await Promise.all(
    servers.map(async (server) => {
      if (!server.perUserAuth) return { id: server.id, isAuthorized: true };
      const session = await mcpOAuthRepository.getAuthenticatedSession(
        server.id,
        currentUser.id,
      );
      return { id: server.id, isAuthorized: !!session?.tokens };
    }),
  );
  const authStatusMap = new Map(
    authStatuses.map((s) => [s.id, s.isAuthorized]),
  );

  const result = servers.map((server) => {
    const mem = updatedMemoryMap.get(server.id);
    const info = mem?.getInfo();
    const isOwner = server.userId === currentUser.id;
    const mcpInfo: MCPServerInfo = {
      ...server,
      // Hide config from non-owners to prevent credential exposure
      config: isOwner ? server.config : undefined,
      enabled: info?.enabled ?? true,
      status: info?.status ?? "disconnected",
      error: info?.error,
      isAuthorized: authStatusMap.get(server.id),
      toolInfo:
        info?.toolInfo && info.toolInfo.length > 0
          ? info.toolInfo
          : (server.toolInfo ?? []),
    };
    return mcpInfo;
  });

  return Response.json(result);
}
