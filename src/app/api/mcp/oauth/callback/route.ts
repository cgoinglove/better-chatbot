import { NextRequest } from "next/server";
import { mcpOAuthRepository } from "@/lib/db/repository";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import logger from "logger";

/**
 * OAuth callback endpoint for MCP servers
 * Handles the authorization code exchange and token storage
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const callbackData = {
    code: searchParams.get("code") || undefined,
    state: searchParams.get("state") || undefined,
    error: searchParams.get("error") || undefined,
    error_description: searchParams.get("error_description") || undefined,
  };

  // Handle OAuth error responses
  if (callbackData.error) {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <script>
    try {
      window.opener?.postMessage({
        type: 'MCP_OAUTH_ERROR',
        error: '${callbackData.error}',
        error_description: '${callbackData.error_description || "Unknown error"}'
      }, window.location.origin);
    } catch (e) {
      console.error('Failed to post message:', e);
    }
    setTimeout(() => window.close(), 1000);
  </script>
  <div class="error">
    <h2>Authentication Failed</h2>
    <p>Error: ${callbackData.error}</p>
    <p>${callbackData.error_description || "Unknown error occurred"}</p>
    <p>This window will close automatically.</p>
  </div>
</body>
</html>`;
    return new Response(errorHtml, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Validate required parameters
  if (!callbackData.code || !callbackData.state) {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <script>
    try {
      window.opener?.postMessage({
        type: 'MCP_OAUTH_ERROR',
        error: 'invalid_request',
        error_description: 'Missing authorization code or state parameter'
      }, window.location.origin);
    } catch (e) {
      console.error('Failed to post message:', e);
    }
    setTimeout(() => window.close(), 1000);
  </script>
  <div class="error">
    <h2>Authentication Failed</h2>
    <p>Missing required parameters</p>
    <p>This window will close automatically.</p>
  </div>
</body>
</html>`;
    return new Response(errorHtml, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Find the OAuth session by state
  const session = await mcpOAuthRepository.getOAuthSessionByState(
    callbackData.state,
  );
  if (!session) {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <script>
    try {
      window.opener?.postMessage({
        type: 'MCP_OAUTH_ERROR',
        error: 'invalid_state',
        error_description: 'Invalid or expired state parameter'
      }, window.location.origin);
    } catch (e) {
      console.error('Failed to post message:', e);
    }
    setTimeout(() => window.close(), 1000);
  </script>
  <div class="error">
    <h2>Authentication Failed</h2>
    <p>Invalid or expired session</p>
    <p>This window will close automatically.</p>
  </div>
</body>
</html>`;
    return new Response(errorHtml, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const client = await mcpClientsManager.refreshClient(session.mcpServerId);
  if (client?.client.status != "authorizing") {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <script>
    try {
      window.opener?.postMessage({
        type: 'MCP_OAUTH_ERROR',
        error: 'invalid_state',
        error_description: 'Client is not in authorizing state'
      }, window.location.origin);
    } catch (e) {
      console.error('Failed to post message:', e);
    }
    setTimeout(() => window.close(), 1000);
  </script>
  <div class="error">
    <h2>Authentication Failed</h2>
    <p>Client is not ready for authorization</p>
    <p>This window will close automatically.</p>
  </div>
</body>
</html>`;
    return new Response(errorHtml, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    await client?.client.finishAuth(callbackData.code);
    await mcpClientsManager.refreshClient(session.mcpServerId);

    const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Success</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
    .success { color: #22c55e; }
  </style>
</head>
<body>
  <script>
    try {
      window.opener?.postMessage({
        type: 'MCP_OAUTH_SUCCESS',
        success: true
      }, window.location.origin);
    } catch (e) {
      console.error('Failed to post message:', e);
    }
    setTimeout(() => window.close(), 1000);
  </script>
  <div class="success">
    <h2>Authentication Successful!</h2>
    <p>You can now close this window.</p>
    <p>This window will close automatically.</p>
  </div>
</body>
</html>`;
    return new Response(successHtml, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Error</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <script>
    try {
      window.opener?.postMessage({
        type: 'MCP_OAUTH_ERROR',
        error: 'auth_failed',
        error_description: 'Failed to complete authentication'
      }, window.location.origin);
    } catch (e) {
      console.error('Failed to post message:', e);
    }
    setTimeout(() => window.close(), 1000);
  </script>
  <div class="error">
    <h2>Authentication Failed</h2>
    <p>Failed to complete the authentication process</p>
    <p>This window will close automatically.</p>
  </div>
</body>
</html>`;
    logger.error("OAuth callback failed", error);
    return new Response(errorHtml, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
