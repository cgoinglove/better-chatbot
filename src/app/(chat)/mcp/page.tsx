import MCPDashboard from "@/components/mcp-dashboard";
import { IS_VERCEL_ENV } from "lib/const";
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const isAddingDisabled = process.env.NOT_ALLOW_ADD_MCP_SERVERS;

  const t = await getTranslations("Info");
  let message: string | undefined;

  if (isAddingDisabled) {
    message = t("mcpAddingDisabled");
  } else if (IS_VERCEL_ENV) {
    message = t("vercelSyncDelay");
  }

  return <MCPDashboard message={message} />;
}
