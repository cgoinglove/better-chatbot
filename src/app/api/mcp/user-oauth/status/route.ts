import { NextRequest, NextResponse } from "next/server";
import { getSession } from "auth/server";
import { mcpUserOAuthRepository, mcpRepository } from "lib/db/repository";

/**
 * Check if a user has valid authentication for an MCP server
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mcpServerId = searchParams.get("mcpServerId");

    if (!mcpServerId) {
      return NextResponse.json(
        { error: "MCP server ID is required" },
        { status: 400 },
      );
    }

    // Check if server requires auth
    const server = await mcpRepository.selectById(mcpServerId);
    if (!server) {
      return NextResponse.json(
        { error: "MCP server not found" },
        { status: 404 },
      );
    }

    // If server doesn't require auth, user is effectively "authenticated"
    if (!server.requiresAuth || server.authProvider === "none") {
      return NextResponse.json({
        authenticated: true,
        requiresAuth: false,
      });
    }

    // Check if user has valid tokens
    const hasValidTokens = await mcpUserOAuthRepository.hasValidTokens(
      session.user.id,
      mcpServerId,
    );

    return NextResponse.json({
      authenticated: hasValidTokens,
      requiresAuth: true,
      authProvider: server.authProvider,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check auth status" },
      { status: 500 },
    );
  }
}

/**
 * Get all MCP servers and their auth status for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mcpServerIds } = await request.json();

    if (!Array.isArray(mcpServerIds)) {
      return NextResponse.json(
        { error: "mcpServerIds must be an array" },
        { status: 400 },
      );
    }

    // Get authenticated servers for user
    const authenticatedServers =
      await mcpUserOAuthRepository.getAuthenticatedServersForUser(
        session.user.id,
      );

    const authenticatedSet = new Set(authenticatedServers);

    // Build status map
    const statusMap: Record<
      string,
      {
        authenticated: boolean;
        requiresAuth: boolean;
        authProvider?: string;
      }
    > = {};

    for (const serverId of mcpServerIds) {
      const server = await mcpRepository.selectById(serverId);
      if (!server) continue;

      if (!server.requiresAuth || server.authProvider === "none") {
        statusMap[serverId] = {
          authenticated: true,
          requiresAuth: false,
        };
      } else {
        statusMap[serverId] = {
          authenticated: authenticatedSet.has(serverId),
          requiresAuth: true,
          authProvider: server.authProvider,
        };
      }
    }

    return NextResponse.json({ status: statusMap });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check auth status" },
      { status: 500 },
    );
  }
}
