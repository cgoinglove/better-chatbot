import useSWR from "swr";
import { fetcher } from "lib/utils";

type Customization = {
  toolName: string;
  mcpServerName: string;
  customPrompt?: string | null;
  enabled: boolean;
};

export const useToolCustomization = (
  toolName: string,
  mcpServerName: string,
) => {
  // Fetch the entire list once
  const {
    data: list,
    error,
    isLoading,
    mutate,
  } = useSWR("tool-customization-list", () => fetcher("/api/tools/customize"));

  const customization: Customization | undefined = list?.find(
    (c: Customization) =>
      c.toolName === toolName && c.mcpServerName === mcpServerName && c.enabled,
  );

  const save = async (customPrompt: string) => {
    const res = await fetch(`/api/tools/customize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ toolName, mcpServerName, customPrompt }),
    });
    if (!res.ok) throw await res.json();
    mutate();
  };

  const remove = async () => {
    const res = await fetch(`/api/tools/customize`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName, mcpServerName }),
    });
    if (!res.ok) throw await res.json();
    mutate();
  };

  return { customization, error, isLoading, mutate, save, remove };
};
