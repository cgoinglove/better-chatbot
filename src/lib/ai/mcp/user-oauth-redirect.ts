"use client";

import { wait } from "lib/utils";

/**
 * Initiates OAuth flow for a user to authenticate with an MCP server
 * Opens a popup window for the OAuth flow and returns when complete
 */
export async function redirectUserMcpOauth(mcpServerId: string): Promise<{
  success: boolean;
  mcpServerId?: string;
  mcpServerName?: string;
  error?: string;
}> {
  // Request authorization URL from the server
  const response = await fetch("/api/mcp/user-oauth/authorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mcpServerId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to initiate OAuth flow");
  }

  const { authorizationUrl } = await response.json();

  if (!authorizationUrl) {
    throw new Error("No authorization URL returned");
  }

  return new Promise((resolve, reject) => {
    // Open OAuth popup
    const authWindow = window.open(
      authorizationUrl,
      "mcp-user-oauth",
      "width=600,height=700,scrollbars=yes,resizable=yes",
    );

    if (!authWindow) {
      return reject(new Error("Please allow popups for OAuth authentication"));
    }

    let messageHandlerRegistered = false;
    let intervalId: NodeJS.Timeout | null = null;

    // Clean up function
    const cleanup = () => {
      if (messageHandlerRegistered) {
        window.removeEventListener("message", messageHandler);
        messageHandlerRegistered = false;
      }
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Message handler for postMessage communication
    const messageHandler = (event: MessageEvent) => {
      // Security: only accept messages from same origin
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === "MCP_USER_OAUTH_SUCCESS") {
        cleanup();
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        resolve({
          success: true,
          mcpServerId: event.data.mcpServerId,
          mcpServerName: event.data.mcpServerName,
        });
      } else if (event.data.type === "MCP_USER_OAUTH_ERROR") {
        cleanup();
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        reject(
          new Error(
            event.data.error_description ||
              event.data.error ||
              "Authentication failed",
          ),
        );
      }
    };

    // Register message event listener
    window.addEventListener("message", messageHandler);
    messageHandlerRegistered = true;

    // Backup: Poll for manual window close
    intervalId = setInterval(() => {
      if (authWindow.closed) {
        cleanup();
        // Window was closed without completing - treat as cancelled
        reject(new Error("Authentication cancelled"));
      }
    }, 1000);

    // Timeout after 5 minutes
    setTimeout(
      () => {
        if (intervalId) {
          cleanup();
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          reject(new Error("Authentication timed out"));
        }
      },
      5 * 60 * 1000,
    );
  });
}

/**
 * Check if a user has valid authentication for an MCP server
 */
export async function checkUserMcpAuth(mcpServerId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/mcp/user-oauth/status?mcpServerId=${mcpServerId}`,
    );
    if (!response.ok) return false;
    const data = await response.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
}
