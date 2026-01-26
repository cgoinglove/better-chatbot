import { NextRequest } from "next/server";
import { mcpRepository, mcpUserOAuthRepository } from "lib/db/repository";
import globalLogger from "logger";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("bgGreen", `MCP User OAuth Callback: `),
});

interface OAuthResponseOptions {
  type: "success" | "error";
  title: string;
  heading: string;
  message: string;
  postMessageType: string;
  postMessageData: Record<string, any>;
  statusCode: number;
}

function createOAuthResponsePage(options: OAuthResponseOptions): Response {
  const {
    type,
    title,
    heading,
    message,
    postMessageType,
    postMessageData,
    statusCode,
  } = options;

  if (type === "success") {
    logger.info("User OAuth callback successful", message);
  } else {
    logger.error("User OAuth callback failed", message);
  }

  const colorClass = type === "success" ? "success" : "error";
  const color = type === "success" ? "#22c55e" : "#ef4444";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; background: #1a1a2e; color: #eee; }
    .${colorClass} { color: ${color}; }
    .card { background: #16213e; padding: 2rem; border-radius: 12px; max-width: 400px; margin: 2rem auto; }
  </style>
</head>
<body>
  <script>
    try {
      window.opener?.postMessage({
        type: '${postMessageType}',
        ${Object.entries(postMessageData)
          .map(([key, value]) => `${key}: '${value}'`)
          .join(", ")}
      }, window.location.origin);
    } catch (e) {
      console.error('Failed to post message:', e);
    }
    setTimeout(() => window.close(), 2000);
  </script>
  <div class="card">
    <div class="${colorClass}">
      <h2>${heading}</h2>
      <p>${message}</p>
      <p style="color: #888; font-size: 0.875rem;">This window will close automatically.</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: statusCode,
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * OAuth callback endpoint for per-user MCP authentication
 * Handles the authorization code exchange and stores tokens per user
 */
export async function GET(request: NextRequest) {
  logger.info("User OAuth callback received");
  const { searchParams } = new URL(request.url);

  const callbackData = {
    code: searchParams.get("code") || undefined,
    state: searchParams.get("state") || undefined,
    error: searchParams.get("error") || undefined,
    error_description: searchParams.get("error_description") || undefined,
  };

  // Handle OAuth error responses
  if (callbackData.error) {
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: `Error: ${callbackData.error}<br/>${callbackData.error_description || "Unknown error occurred"}`,
      postMessageType: "MCP_USER_OAUTH_ERROR",
      postMessageData: {
        error: callbackData.error,
        error_description: callbackData.error_description || "Unknown error",
      },
      statusCode: 400,
    });
  }

  // Validate required parameters
  if (!callbackData.code || !callbackData.state) {
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: "Missing required parameters",
      postMessageType: "MCP_USER_OAUTH_ERROR",
      postMessageData: {
        error: "invalid_request",
        error_description: "Missing authorization code or state parameter",
      },
      statusCode: 400,
    });
  }

  // Find the OAuth session by state
  const session = await mcpUserOAuthRepository.getSessionByState(
    callbackData.state,
  );

  if (!session) {
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: "Invalid or expired session",
      postMessageType: "MCP_USER_OAUTH_ERROR",
      postMessageData: {
        error: "invalid_state",
        error_description: "Invalid or expired state parameter",
      },
      statusCode: 400,
    });
  }

  // Get the MCP server configuration for token exchange
  const server = await mcpRepository.selectById(session.mcpServerId);
  if (!server) {
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: "MCP server not found",
      postMessageType: "MCP_USER_OAUTH_ERROR",
      postMessageData: {
        error: "server_not_found",
        error_description: "The MCP server configuration was not found",
      },
      statusCode: 404,
    });
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(
      callbackData.code,
      session.codeVerifier || "",
      server,
    );

    // Save tokens to the user's session
    await mcpUserOAuthRepository.saveTokens(callbackData.state, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
      scope: tokens.scope,
    });

    logger.info(
      `User ${session.userId} successfully authenticated to MCP server ${server.name}`,
    );

    return createOAuthResponsePage({
      type: "success",
      title: "Authentication Successful",
      heading: "✓ Authenticated!",
      message: `You are now connected to ${server.name}`,
      postMessageType: "MCP_USER_OAUTH_SUCCESS",
      postMessageData: {
        success: "true",
        mcpServerId: session.mcpServerId,
        mcpServerName: server.name,
      },
      statusCode: 200,
    });
  } catch (error: any) {
    logger.error("Token exchange failed", error);
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: error.message || "Failed to exchange authorization code",
      postMessageType: "MCP_USER_OAUTH_ERROR",
      postMessageData: {
        error: "token_exchange_failed",
        error_description: error.message || "Failed to complete authentication",
      },
      statusCode: 500,
    });
  }
}

/**
 * Exchange authorization code for tokens with the OAuth provider
 */
async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  server: any,
): Promise<{
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
}> {
  if (server.authProvider === "okta" && server.authConfig?.issuer) {
    const tokenUrl = `${server.authConfig.issuer}/v1/token`;

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.BETTER_AUTH_URL}/api/mcp/user-oauth/callback`,
      client_id: server.authConfig.clientId || "",
      code_verifier: codeVerifier,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error_description ||
          errorData.error ||
          `Token exchange failed: ${response.status}`,
      );
    }

    return response.json();
  }

  throw new Error("Unsupported auth provider for token exchange");
}
