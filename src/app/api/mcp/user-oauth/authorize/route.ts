import { NextRequest, NextResponse } from "next/server";
import { getSession } from "auth/server";
import { mcpRepository, mcpUserOAuthRepository } from "lib/db/repository";
import { generateUUID } from "lib/utils";
import globalLogger from "logger";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("bgBlue", `MCP User OAuth Authorize: `),
});

/**
 * Initiates OAuth flow for a user to authenticate with an MCP server
 * This creates a per-user OAuth session and returns the authorization URL
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mcpServerId } = await request.json();
    if (!mcpServerId) {
      return NextResponse.json(
        { error: "MCP server ID is required" },
        { status: 400 },
      );
    }

    // Get the MCP server configuration
    const server = await mcpRepository.selectById(mcpServerId);
    if (!server) {
      return NextResponse.json(
        { error: "MCP server not found" },
        { status: 404 },
      );
    }

    // Check if server requires authentication
    if (!server.requiresAuth || server.authProvider === "none") {
      return NextResponse.json(
        { error: "This MCP server does not require authentication" },
        { status: 400 },
      );
    }

    // Generate OAuth state and code verifier for PKCE
    const state = generateUUID();
    const codeVerifier = generateUUID() + generateUUID(); // Longer for PKCE

    // Create or update the user's OAuth session
    await mcpUserOAuthRepository.upsertSession(session.user.id, mcpServerId, {
      state,
      codeVerifier,
    });

    // Build the authorization URL based on the auth provider
    let authorizationUrl: string;

    if (server.authProvider === "okta" && server.authConfig?.issuer) {
      const params = new URLSearchParams({
        client_id: server.authConfig.clientId || "",
        response_type: "code",
        scope: server.authConfig.scopes?.join(" ") || "openid profile email",
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.BETTER_AUTH_URL}/api/mcp/user-oauth/callback`,
        state,
        code_challenge: await generateCodeChallenge(codeVerifier),
        code_challenge_method: "S256",
      });

      authorizationUrl = `${server.authConfig.issuer}/v1/authorize?${params.toString()}`;
    } else {
      // Generic OAuth2 - would need to be configured per server
      return NextResponse.json(
        { error: "OAuth2 provider not fully configured" },
        { status: 400 },
      );
    }

    logger.info(
      `User ${session.user.id} initiating OAuth for MCP server ${server.name}`,
    );

    return NextResponse.json({
      authorizationUrl,
      state,
    });
  } catch (error: any) {
    logger.error("Failed to initiate OAuth flow", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate OAuth flow" },
      { status: 500 },
    );
  }
}

/**
 * Generate PKCE code challenge from code verifier
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
