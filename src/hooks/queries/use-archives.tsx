import { appStore } from "@/app/store";
import { ArchiveWithItemCount } from "app-types/archive";
import { fetcher } from "lib/utils";
import useSWR from "swr";

export const useArchives = () => {
  return useSWR<ArchiveWithItemCount[]>("/api/archive", fetcher, {
    fallbackData: [],
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    onSuccess: (data) => {
      appStore.setState({
        archiveList: data,
      });
    },
  });
};
