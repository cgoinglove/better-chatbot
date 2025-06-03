import useSWR from "swr";
import { fetcher } from "lib/utils";

export const useMcpServerCustomization = (serverName: string | undefined) => {
  const {
    data: list,
    error,
    isLoading,
    mutate,
  } = useSWR("mcp-server-customization-list", () =>
    fetcher("/api/mcp/servers/customize"),
  );

  const customization = list?.find(
    (c: any) => c.mcpServerName === serverName && c.enabled,
  );

  const save = async (customInstructions: string) => {
    const res = await fetch(`/api/mcp/servers/customize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverName, customInstructions }),
    });
    if (!res.ok) throw await res.json();
    mutate();
  };

  const remove = async () => {
    const res = await fetch(
      `/api/mcp/servers/customize?serverName=${serverName}`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok) throw await res.json();
    mutate();
  };

  return { customization, error, isLoading, save, remove };
};
