import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { BASE_URL } from "lib/const";

export async function GET() {
  const list = await mcpClientsManager.getClients();
  console.log({
    BASE_URL,
    vercel: process.env.VERCEL_URL,
    port: process.env.PORT,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  });

  console.dir(process.env);
  const result = list.map(({ client, id }) => {
    return {
      ...client.getInfo(),
      id,
    };
  });
  return Response.json(result);
}
