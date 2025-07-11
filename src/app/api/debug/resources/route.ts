import { NextRequest, NextResponse } from "next/server";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

export async function GET(_request: NextRequest) {
  try {
    const clients = await mcpClientsManager.getClients();
    const debugInfo: any = {};

    for (const { id, client } of clients) {
      const info = client.getInfo();
      debugInfo[id] = {
        name: client.name,
        tools: info.toolInfo.map((t) => ({
          name: t.name,
          description: t.description,
        })),
        resources: info.resourceInfo.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
        })),
        resourceTemplates: info.resourceTemplateInfo.map((t) => ({
          uriTemplate: t.uriTemplate,
          name: t.name,
          description: t.description,
        })),
      };
    }

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    console.error("Debug resources error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
