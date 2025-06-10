import { appStore } from "@/app/store";
import { fetcher } from "lib/utils";
import useSWR from "swr";

export const useChatModels = () => {
  return useSWR<
    {
      provider: string;
      models: {
        name: string;
        isToolCallUnsupported: boolean;
      }[];
    }[]
  >("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: [],
    onSuccess: (data) => {
      const status = appStore.getState();
      if (!status.chatModel) {
        const firstProvider = data[0].provider;
        const model = data[0].models[0].name;
        appStore.setState({ chatModel: { provider: firstProvider, model } });
      }
    },
  });
};
