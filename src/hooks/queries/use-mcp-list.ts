"use client";
import { appStore } from "@/app/store";
import useSWR, { SWRConfiguration, useSWRConfig } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { fetcher, objectFlow } from "lib/utils";
import { MCPServerConfig, MCPToolInfo } from "app-types/mcp";

export type McpListItem = {
  id: string;
  name: string;
  config: MCPServerConfig;
  status: "connected" | "disconnected" | "loading" | "authorizing";
  error?: unknown;
  toolInfo: MCPToolInfo[];
  visibility: "private" | "public" | "readonly";
  ownerId?: string | null;
  isOwner: boolean;
};

export function useMcpList(options?: SWRConfiguration) {
  const swr = useSWR<McpListItem[]>("/api/mcp/list", fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    focusThrottleInterval: 1000 * 60 * 5,
    fallbackData: [],
    onError: handleErrorWithToast,
    onSuccess: (data) => {
      const ids = data.map((v) => v.id);
      appStore.setState((prev) => ({
        mcpList: (data as McpListItem[]).map((v) => ({
          id: v.id,
          name: v.name,
          config: v.config,
          status: v.status,
          error: v.error,
          toolInfo: v.toolInfo,
        })),
        allowedMcpServers: objectFlow(prev.allowedMcpServers || {}).filter(
          (_, key) => ids.includes(key),
        ),
      }));
    },
    ...options,
  });

  return {
    data: swr.data ?? [],
    isLoading: swr.isLoading,
    isValidating: swr.isValidating,
    error: swr.error,
    mutate: swr.mutate,
  };
}

// Utility hook to invalidate/update all MCP list caches
export function useMutateMcps() {
  const { mutate } = useSWRConfig();

  return (
    updated?: Partial<McpListItem> & { id: string },
    deleteItem?: boolean,
  ) => {
    mutate(
      (key) => {
        if (typeof key !== "string") return false;
        return key.startsWith("/api/mcp/list");
      },
      (cached: any) => {
        if (!Array.isArray(cached) || !updated) return cached;
        if (deleteItem)
          return cached.filter((i: McpListItem) => i.id !== updated.id);
        const idx = cached.findIndex((i: McpListItem) => i.id === updated.id);
        if (idx >= 0) {
          const copy = [...cached];
          copy[idx] = { ...copy[idx], ...updated };
          return copy;
        }
        return [updated, ...cached];
      },
      { revalidate: true },
    );

    if (updated?.id) {
      mutate(`/api/mcp/${updated.id}`, undefined, { revalidate: true });
    }
  };
}
