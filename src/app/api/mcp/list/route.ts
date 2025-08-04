import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

export async function GET() {
  const list = await mcpClientsManager.getClients();
  const result = list.map(({ client, id }) => {
    return {
      ...client.getInfo(),
      id,
    };
  });
  return Response.json(result);
}
