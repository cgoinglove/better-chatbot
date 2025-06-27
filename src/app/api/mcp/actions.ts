"use server";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { z } from "zod";
import { Safe, safe } from "ts-safe";
import { errorToString, safeJSONParse } from "lib/utils";
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

function safeCallToolResult(chain: Safe<any>) {
  return chain
    .map((res) => {
      if (res?.content && Array.isArray(res.content)) {
        const parsedResult = {
          ...res,
          content: res.content.map((c) => {
            if (c?.type === "text" && c?.text) {
              const parsed = safeJSONParse(c.text);
              return {
                type: "text",
                text: parsed.success ? parsed.value : c.text,
              };
            }
            return c;
          }),
        };
        return parsedResult;
      }

      return res;
    })
    .ifFail((err) => {
      return {
        isError: true,
        error: {
          message: errorToString(err),
          name: err?.name || "ERROR",
        },
        content: [],
      };
    })
    .unwrap();
}

export async function callMcpToolAction(
  id: string,
  toolName: string,
  input?: unknown,
) {
  const chain = safe(async () => {
    const client = await mcpClientsManager.getClient(id);
    if (!client) {
      throw new Error("Client not found");
    }
    return client.client.callTool(toolName, input);
  });
  return safeCallToolResult(chain);
}

export async function callMcpToolByServerNameAction(
  serverName: string,
  toolName: string,
  input?: unknown,
) {
  const chain = safe(async () => {
    const client = await mcpClientsManager.getClients().then((clients) => {
      return clients.find(
        (client) => client.client.getInfo().name === serverName,
      );
    });
    if (!client) {
      throw new Error("Client not found");
    }
    return client.client.callTool(toolName, input);
  });
  return safeCallToolResult(chain);
}
