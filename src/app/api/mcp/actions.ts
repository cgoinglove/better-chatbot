"use server";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { z } from "zod";

import { McpServerTable } from "lib/db/pg/schema.pg";
import { mcpOAuthRepository, mcpRepository } from "lib/db/repository";
import {
  canCreateMCP,
  canManageMCPServer,
  canShareMCPServer,
  getCurrentUser,
} from "lib/auth/permissions";

export async function selectMcpClientsAction() {
  // Get current user to filter MCP servers
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  // Get all MCP servers the user can access (their own + shared)
  const accessibleServers = await mcpRepository.selectAllForUser(
    currentUser.id,
  );

  // Warm up clients for the current user
  await Promise.allSettled(
    accessibleServers.map((server) =>
      mcpClientsManager.getClient(server.id, currentUser.id),
    ),
  );

  // Get all active clients and filter to only accessible ones
  const list = await mcpClientsManager.getClients(currentUser.id);
  const activeClientsMap = new Map(list.map((c) => [c.id, c.client]));

  // Check authorization status for per-user auth servers
  const authStatuses = await Promise.all(
    accessibleServers.map(async (server) => {
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

  return accessibleServers.map((server) => {
    const client = activeClientsMap.get(server.id);
    const info = client?.getInfo();

    return {
      id: server.id,
      name: server.name,
      config: server.userId === currentUser.id ? server.config : undefined,
      status: info?.status ?? ("disconnected" as const),
      enabled: info?.enabled ?? true,
      userId: server.userId,
      visibility: server.visibility,
      perUserAuth: server.perUserAuth ?? false,
      isAuthorized: authStatusMap.get(server.id),
      toolInfo:
        info?.toolInfo && info.toolInfo.length > 0
          ? info.toolInfo
          : (server.toolInfo ?? []),
      isOwner: server.userId === currentUser.id,
      canManage:
        server.userId === currentUser.id || currentUser.role === "admin",
    };
  });
}

export async function selectMcpClientAction(id: string) {
  const currentUser = await getCurrentUser();
  const client = await mcpClientsManager.getClient(id, currentUser?.id);
  if (!client) {
    throw new Error("Client not found");
  }
  return {
    ...client.client.getInfo(),
    id,
  };
}

export async function saveMcpClientAction(
  server: typeof McpServerTable.$inferInsert,
) {
  if (process.env.NOT_ALLOW_ADD_MCP_SERVERS) {
    throw new Error("Not allowed to add MCP servers");
  }

  // Get current user
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("You must be logged in to create MCP connections");
  }

  // Check if user has permission to create/edit MCP connections
  const hasPermission = await canCreateMCP();
  if (!hasPermission) {
    throw new Error("You don't have permission to create MCP connections");
  }
  // Validate name to ensure it only contains alphanumeric characters and hyphens
  const nameSchema = z.string().regex(/^[a-zA-Z0-9\-]+$/, {
    message:
      "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
  });

  const result = nameSchema.safeParse(server.name);
  if (!result.success) {
    throw new Error(
      "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
    );
  }

  // Check for duplicate names if creating a featured server
  if (server.visibility === "public") {
    // Only admins can create featured MCP servers
    const canShare = await canShareMCPServer();
    if (!canShare) {
      throw new Error("Only administrators can feature MCP servers");
    }

    // Check if a featured server with this name already exists
    const existing = await mcpRepository.existsByServerName(server.name);
    if (existing && !server.id) {
      throw new Error("A featured MCP server with this name already exists");
    }
  }

  // Add userId to the server object
  const serverWithUser = {
    ...server,
    userId: currentUser.id,
    visibility: server.visibility || "private",
    toolInfo: server.toolInfo ?? undefined,
  };

  return mcpClientsManager.persistClient(serverWithUser);
}

export async function existMcpClientByServerNameAction(serverName: string) {
  return await mcpRepository.existsByServerName(serverName);
}

export async function removeMcpClientAction(id: string) {
  // Get the MCP server to check ownership
  const mcpServer = await mcpRepository.selectById(id);
  if (!mcpServer) {
    throw new Error("MCP server not found");
  }

  // Check if user has permission to delete this specific MCP server
  const canManage = await canManageMCPServer(
    mcpServer.userId,
    mcpServer.visibility,
  );
  if (!canManage) {
    throw new Error("You don't have permission to delete this MCP connection");
  }

  await mcpClientsManager.removeClient(id);
}

export async function refreshMcpClientAction(id: string) {
  const currentUser = await getCurrentUser();
  await mcpClientsManager.refreshClient(id, currentUser?.id);
}

export async function authorizeMcpClientAction(id: string) {
  const currentUser = await getCurrentUser();
  await refreshMcpClientAction(id);
  const client = await mcpClientsManager.getClient(id, currentUser?.id);
  if (client?.client.status != "authorizing") {
    throw new Error("Not Authorizing");
  }
  return client.client.getAuthorizationUrl()?.toString();
}

export async function checkTokenMcpClientAction(id: string) {
  const currentUser = await getCurrentUser();
  const session = await mcpOAuthRepository.getAuthenticatedSession(
    id,
    currentUser?.id,
  );

  // for wait connect to mcp server
  await mcpClientsManager.getClient(id, currentUser?.id).catch(() => null);

  return !!session?.tokens;
}

export async function callMcpToolAction(
  id: string,
  toolName: string,
  input: unknown,
) {
  const currentUser = await getCurrentUser();
  return mcpClientsManager.toolCall(id, toolName, input, currentUser?.id);
}

export async function callMcpToolByServerNameAction(
  serverName: string,
  toolName: string,
  input: unknown,
) {
  const currentUser = await getCurrentUser();
  return mcpClientsManager.toolCallByServerName(
    serverName,
    toolName,
    input,
    currentUser?.id,
  );
}

export async function shareMcpServerAction(
  id: string,
  visibility: "public" | "private",
) {
  // Only admins can feature MCP servers
  const canShare = await canShareMCPServer();
  if (!canShare) {
    throw new Error("Only administrators can feature MCP servers");
  }

  // Update the visibility of the MCP server
  await mcpRepository.updateVisibility(id, visibility);

  return { success: true };
}

export async function updatePerUserAuthAction(
  id: string,
  perUserAuth: boolean,
) {
  // Get the MCP server to check ownership
  const mcpServer = await mcpRepository.selectById(id);
  if (!mcpServer) {
    throw new Error("MCP server not found");
  }

  // Check if user has permission to manage this specific MCP server
  const canManage = await canManageMCPServer(
    mcpServer.userId,
    mcpServer.visibility,
  );
  if (!canManage) {
    throw new Error(
      "You don't have permission to update this MCP connection settings",
    );
  }

  // Update the perUserAuth of the MCP server
  await mcpRepository.updatePerUserAuth(id, perUserAuth);

  // Refresh the client to apply changes
  await mcpClientsManager.refreshClient(id);

  return { success: true };
}
