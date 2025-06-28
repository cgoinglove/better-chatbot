import { selectMcpClientsAction } from "@/app/api/mcp/actions";
import { appStore } from "@/app/store";
import useSWR, { SWRConfiguration } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";

export function useMcpList(options?: SWRConfiguration) {
  return useSWR("mcp-list", selectMcpClientsAction, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    fallbackData: [],
    onError: handleErrorWithToast,
    onSuccess: (data) => {
      appStore.setState({ mcpList: data });
    },
    ...options,
  });
}
