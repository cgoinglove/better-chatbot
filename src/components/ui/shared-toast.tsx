"use client";

import { errorToString } from "lib/utils";
import { toast } from "sonner";
import JsonView from "ui/json-view";

export const notImplementedToast = () => {
  toast.warning(
    <div className="flex gap-2 flex-col">
      <span className="font-semibold">Not implemented yet 🤣</span>
      <span className="text-xs text-muted-foreground">
        (This feature is coming soon)
      </span>
    </div>,
  );
};

export const handleErrorWithToast = (error: Error, id?: string) => {
  toast.error(`${error?.name || "Error"}`, {
    description: (
      <div className="my-4 max-h-[340px] overflow-y-auto">
        <JsonView data={errorToString(error)} />
      </div>
    ),
    id,
  });

  return error;
};

export const mcpOAuthRequiredToast = (authUrl: string) => {
  const promise = new Promise((resolve, reject) => {
    const authWindow = window.open(
      authUrl,
      "oauth",
      "width=600,height=800,scrollbars=yes,resizable=yes",
    );
    if (!authWindow) {
      toast.error("Please allow popups for OAuth authentication");
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

      if (event.data.type === "MCP_OAUTH_SUCCESS") {
        cleanup();
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        resolve(true);
      } else if (event.data.type === "MCP_OAUTH_ERROR") {
        cleanup();
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        const errorMessage =
          event.data.error_description ||
          event.data.error ||
          "Authentication failed";
        reject(new Error(errorMessage));
      }
    };

    // Register message event listener
    window.addEventListener("message", messageHandler);
    messageHandlerRegistered = true;

    // Backup: Poll for manual window close (in case postMessage fails)
    intervalId = setInterval(() => {
      if (authWindow.closed) {
        cleanup();
        resolve(true);
      }
    }, 1000);
  });

  toast.promise(promise, {
    loading: "OAuth authorization required",
    success: "Authentication completed. Refreshing...",
    error: "Authentication failed",
  });
  return promise;
};
