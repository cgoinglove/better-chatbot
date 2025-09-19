import { MCPServerInfo } from "app-types/mcp";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { mcpRepository } from "lib/db/repository";
import { getSession } from "auth/server";

export async function GET() {
  const session = await getSession();

  const [allServers, memoryClients] = await Promise.all([
    mcpRepository.selectAll(), // global, for sync only
    mcpClientsManager.getClients(),
  ]);

  const memoryMap = new Map(
    memoryClients.map(({ id, client }) => [id, client] as const),
  );

  const addTargets = allServers.filter((server) => !memoryMap.has(server.id));

  const serverIds = new Set(allServers.map((s) => s.id));
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

  const visibleServers = session?.user?.id
    ? await mcpRepository.selectAllByAccess(session.user.id)
    : [];

  const result = visibleServers.map((server) => {
    const mem = memoryMap.get(server.id);
    const info = mem?.getInfo();
    const isOwner = server.userId === session?.user?.id;
    const mcpInfo: MCPServerInfo & { id: string } & {
      visibility: "private" | "public" | "readonly";
    } & { ownerId?: string | null; isOwner: boolean } = {
      id: server.id,
      name: server.name,
      config: server.config,
      status: info?.status ?? "loading",
      error: info?.error,
      toolInfo: info?.toolInfo ?? [],
      visibility: server.visibility,
      isOwner,
      ...(isOwner ? {} : { ownerId: server.userId }),
    };
    return mcpInfo;
  });

  return Response.json(result);
}
