"use client";

import useSWR, { SWRConfiguration, useSWRConfig } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { fetcher } from "lib/utils";
import type { PluginWithUserState } from "app-types/plugin";

interface UsePluginsParams {
  scope?: string;
  enabled?: boolean;
  category?: string;
}

function buildPluginsUrl(params?: UsePluginsParams): string {
  const url = new URL("/api/plugins", "http://localhost");
  if (params?.scope) url.searchParams.set("scope", params.scope);
  if (params?.enabled) url.searchParams.set("enabled", "true");
  if (params?.category) url.searchParams.set("category", params.category);
  return `/api/plugins${url.search}`;
}

export function usePlugins(
  params?: UsePluginsParams,
  options?: SWRConfiguration,
) {
  return useSWR<PluginWithUserState[]>(buildPluginsUrl(params), fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    fallbackData: [],
    onError: handleErrorWithToast,
    ...options,
  });
}

export function useEnabledPlugins(options?: SWRConfiguration) {
  return usePlugins({ enabled: true }, options);
}

export function useMutatePlugins() {
  const { mutate } = useSWRConfig();

  return () => {
    mutate(
      (key) => {
        if (typeof key !== "string") return false;
        return key.startsWith("/api/plugins");
      },
      undefined,
      { revalidate: true },
    );
  };
}

export function useEnablePlugin() {
  const { mutate } = useSWRConfig();

  return async (pluginId: string) => {
    const res = await fetch(`/api/plugins/${pluginId}/enable`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to enable plugin");
    const data = await res.json();
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/plugins"),
      undefined,
      { revalidate: true },
    );
    return data;
  };
}

export function useDisablePlugin() {
  const { mutate } = useSWRConfig();

  return async (pluginId: string) => {
    const res = await fetch(`/api/plugins/${pluginId}/enable`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to disable plugin");
    const data = await res.json();
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/plugins"),
      undefined,
      { revalidate: true },
    );
    return data;
  };
}

export function useCreatePlugin() {
  const { mutate } = useSWRConfig();

  return async (data: Partial<PluginWithUserState>) => {
    const res = await fetch("/api/plugins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create plugin");
    const result = await res.json();
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/plugins"),
      undefined,
      { revalidate: true },
    );
    return result;
  };
}

export function useUpdatePlugin() {
  const { mutate } = useSWRConfig();

  return async ({
    id,
    data,
  }: {
    id: string;
    data: Partial<PluginWithUserState>;
  }) => {
    const res = await fetch(`/api/plugins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update plugin");
    const result = await res.json();
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/plugins"),
      undefined,
      { revalidate: true },
    );
    return result;
  };
}

export function useDeletePlugin() {
  const { mutate } = useSWRConfig();

  return async (pluginId: string) => {
    const res = await fetch(`/api/plugins/${pluginId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete plugin");
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/plugins"),
      undefined,
      { revalidate: true },
    );
  };
}
