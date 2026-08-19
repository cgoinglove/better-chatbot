"use client";
import useSWR, { type SWRConfiguration } from "swr";
import { fetcher } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";

export type ComposioToolkit = {
  slug: string;
  name: string;
  logo?: string;
  isConnected: boolean;
  connectedAccountId?: string;
};

export function useComposioConnections(
  search?: string,
  options?: SWRConfiguration,
) {
  const key = search?.trim()
    ? `/api/connections?search=${encodeURIComponent(search.trim())}`
    : "/api/connections";

  return useSWR<{ toolkits: ComposioToolkit[] }>(key, fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    dedupingInterval: 5000,
    onError: handleErrorWithToast,
    ...options,
  });
}
