import { getSession } from "auth/server";
import { redirect } from "next/navigation";
import { CustomizeShell } from "@/components/customize/customize-shell";
import MCPDashboard from "@/components/mcp-dashboard";

export const dynamic = "force-dynamic";

export default async function CustomizePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { tab } = await searchParams;
  const activeTab = tab === "connectors" ? "connectors" : "skills";

  return (
    <CustomizeShell
      activeTab={activeTab}
      connectorsContent={<MCPDashboard user={session.user} />}
    />
  );
}
