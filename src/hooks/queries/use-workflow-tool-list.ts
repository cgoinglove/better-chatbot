"use client";
import { selectExecuteAbilityWorkflowsAction } from "@/app/api/workflow/actions";
import useSWR, { SWRConfiguration } from "swr";
import { appStore } from "@/app/store";

export function useWorkflowToolList(options?: SWRConfiguration) {
  return useSWR("workflow-tool-list", selectExecuteAbilityWorkflowsAction, {
    errorRetryCount: 0,
    revalidateOnFocus: false,
    focusThrottleInterval: 1000 * 60 * 30,
    fallbackData: [],
    onSuccess: (data) => {
      appStore.setState({ workflowToolList: data });
    },
    ...options,
  });
}
