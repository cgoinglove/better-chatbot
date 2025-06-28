import { getExecuteAbilityWorkflowsAction } from "@/app/api/workflow/actions";
import useSWR, { SWRConfiguration } from "swr";
import { appStore } from "@/app/store";

export function useWorkflowToolList(options?: SWRConfiguration) {
  return useSWR("workflow-tool-list", getExecuteAbilityWorkflowsAction, {
    errorRetryCount: 0,
    revalidateOnFocus: false,
    focusThrottleInterval: 1000 * 60 * 30,
    onSuccess: (data) => {
      appStore.setState({ workflowToolList: data });
    },
    ...options,
  });
}
