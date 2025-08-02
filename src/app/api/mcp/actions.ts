"use server";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { z } from "zod";

import { McpServerSchema } from "lib/db/pg/schema.pg";

export async function selectMcpClientsAction() {
  const list = await mcpClientsManager.getClients();
  return list.map(({ client, id }) => {
    return {
      ...client.getInfo(),
      id,
    };
  });
}

export async function selectMcpClientAction(id: string) {
  const client = await mcpClientsManager.getClient(id);
  if (!client) {
    throw new Error("Client not found");
  }
  return {
    ...client.client.getInfo(),
    id,
  };
}

export async function saveMcpClientAction(
  server: typeof McpServerSchema.$inferInsert,
) {
  if (process.env.NOT_ALLOW_ADD_MCP_SERVERS) {
    throw new Error("Not allowed to add MCP servers");
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

  await mcpClientsManager.persistClient(server);
}

export async function existMcpClientByServerNameAction(serverName: string) {
  const client = await mcpClientsManager.getClients().then((clients) => {
    return clients.find(
      (client) => client.client.getInfo().name === serverName,
    );
  });
  return !!client;
}

export async function removeMcpClientAction(id: string) {
  await mcpClientsManager.removeClient(id);
}

export async function refreshMcpClientAction(id: string) {
  await mcpClientsManager.refreshClient(id);
}

export async function callMcpToolAction(
  id: string,
  toolName: string,
  input: unknown,
) {
  return mcpClientsManager.toolCall(id, toolName, input);
}

export async function callMcpToolByServerNameAction(
  serverName: string,
  toolName: string,
  input: unknown,
) {
  return mcpClientsManager.toolCallByServerName(serverName, toolName, input);
}
