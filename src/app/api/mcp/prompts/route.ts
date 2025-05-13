export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Only import Node.js-specific modules in a dynamic import
async function getMCPManager() {
  const { mcpClientsManager } = await import("lib/ai/mcp/mcp-manager");
  const { extractMCPToolId } = await import("lib/ai/mcp/mcp-tool-id");
  return { mcpClientsManager, extractMCPToolId };
}

export async function GET(_request: NextRequest) {
  try {
    // Dynamically import the MCP manager
    const { mcpClientsManager } = await getMCPManager();

    const clients = mcpClientsManager.getClients();

    // Create a map of all available prompts from all connected MCP servers
    const prompts = clients
      .filter((client) => client.getInfo().status === "connected")
      .flatMap((client) => {
        const serverName = client.getInfo().name;
        // Iterate over client.promptInfo which contains MCPPromptInfo objects
        return (client.promptInfo || []).map((promptInfoItem) => ({
          id: `${serverName}/${promptInfoItem.name}`,
          name: promptInfoItem.name,
          description: promptInfoItem.description || "",
          serverName,
          arguments: promptInfoItem.arguments || [],
        }));
      });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Error fetching MCP prompts:", error);
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
  }
}

const ExecutePromptSchema = z.object({
  promptId: z.string(),
  args: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Dynamically import the MCP manager
    const { mcpClientsManager, extractMCPToolId } = await getMCPManager();

    const body = await request.json();
    const { promptId, args } = ExecutePromptSchema.parse(body);

    // Extract server name and prompt name from the combined ID
    const { serverName, toolName: promptName } = extractMCPToolId(promptId);

    // Find the client for this server
    const client = mcpClientsManager
      .getClients()
      .find((c) => c.getInfo().name === serverName);

    if (!client) {
      return NextResponse.json(
        { error: `MCP server "${serverName}" not found` },
        { status: 404 },
      );
    }

    if (!client.prompts || !client.prompts[promptName]) {
      return NextResponse.json(
        { error: `Prompt "${promptName}" not found on server "${serverName}"` },
        { status: 404 },
      );
    }

    // Execute the prompt
    const result = await client.getPrompt(promptName, args || {});

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error executing MCP prompt:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.format() },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to execute prompt" }, { status: 500 });
  }
}
