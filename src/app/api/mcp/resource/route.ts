import { NextRequest, NextResponse } from "next/server";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { safe } from "ts-safe";
import { z } from "zod";

const ResourceRequestSchema = z.object({
  uri: z.string(),
  serverId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return safe(async () => {
    const body = await request.json();
    const { uri, serverId } = ResourceRequestSchema.parse(body);

    const clients = await mcpClientsManager.getClients();

    // Find the appropriate client
    let targetClient: { client: any } | undefined = undefined;

    if (serverId) {
      // Try to find by server ID first
      targetClient = clients.find(({ client }) => {
        const info = client.getInfo();
        return info.name === serverId;
      });
    }

    if (!targetClient) {
      // Find by resource availability
      for (const { client } of clients) {
        const info = client.getInfo();
        const hasResource =
          info.resourceInfo.some((r) => r.uri === uri) ||
          info.resourceTemplateInfo.some((t) =>
            matchesTemplate(uri, t.uriTemplate),
          );

        if (hasResource) {
          targetClient = { client };
          break;
        }
      }
    }

    if (!targetClient) {
      return NextResponse.json(
        { error: "No MCP client found that can handle this resource" },
        { status: 404 },
      );
    }

    try {
      const content = await targetClient.client.readResource(uri);
      return NextResponse.json({ content });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch resource content",
        },
        { status: 500 },
      );
    }
  })
    .ifFail((error) => {
      console.error("Resource fetch error:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Internal server error",
        },
        { status: 500 },
      );
    })
    .unwrap();
}

/**
 * Simple template matching for resource URIs
 */
function matchesTemplate(uri: string, template: string): boolean {
  // Convert template to regex by replacing {param} with [^/]+
  const regexPattern = template.replace(/\{[^}]+\}/g, "[^/]+");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(uri);
}
