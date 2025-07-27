"use client";
import { appStore } from "@/app/store";
import useSWR, { SWRConfiguration } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { fetcher } from "lib/utils";
import { Agent } from "app-types/agent";

export function useAgents(options?: SWRConfiguration) {
  return useSWR<Omit<Agent, "instructions">[]>("/api/agent", fetcher, {
    errorRetryCount: 0,
    revalidateOnFocus: false,
    fallbackData: [],
    onError: handleErrorWithToast,
    onSuccess: (data) => {
      appStore.setState({ agentList: data });
    },
    ...options,
  });
}
