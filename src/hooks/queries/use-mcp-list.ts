"use client";
import { appStore } from "@/app/store";
import useSWR, { SWRConfiguration, useSWRConfig } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { fetcher, objectFlow } from "lib/utils";
import { MCPServerInfo, MCPServerConfig, MCPToolInfo } from "app-types/mcp";

export type McpListItem = {
  id: string;
  name: string;
  config: MCPServerConfig;
  status: "connected" | "disconnected" | "loading" | "authorizing";
  error?: unknown;
  toolInfo: MCPToolInfo[];
  visibility: "private" | "public" | "readonly";
  ownerId?: string | null;
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
      // Keep legacy shape for appStore.mcpList to avoid breaking other usages
      const legacy: (MCPServerInfo & { id: string })[] = (
        data as McpListItem[]
      ).map((v) => ({
        id: v.id,
        name: v.name,
        config: v.config,
        status: v.status,
        error: v.error,
        toolInfo: v.toolInfo,
      }));
      appStore.setState((prev) => ({
        mcpList: legacy,
        allowedMcpServers: objectFlow(prev.allowedMcpServers || {}).filter(
          (_, key) => ids.includes(key),
        ),
      }));
    },
    ...options,
  });

  // Note: ownerId is omitted for owned items by API contract

  const items = (swr.data ?? []).map((v) => ({ ...v }));
  const myMcps = items.filter((item) => !item.ownerId);
  const sharedMcps = items.filter((item) => !!item.ownerId);

  return {
    // Backward-compatible alias for older call sites
    data: items,
    items,
    myMcps,
    sharedMcps,
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
