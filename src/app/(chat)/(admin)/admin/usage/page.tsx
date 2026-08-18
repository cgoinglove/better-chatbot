import { requireAdminPermission } from "auth/permissions";
import { unauthorized } from "next/navigation";
import { DEFAULT_USAGE_PERIOD, getAdminUsageOverview } from "lib/admin/server";
import { UsageDashboard } from "@/components/admin/usage-dashboard";

// Force dynamic rendering to avoid static generation issues with session
export const dynamic = "force-dynamic";

export default async function UsagePage() {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }

  const data = await getAdminUsageOverview(DEFAULT_USAGE_PERIOD);

  return (
    <div className="relative bg-background w-full flex flex-col min-h-screen">
      <div className="flex-1 overflow-y-auto p-6 w-full">
        <div className="space-y-6 w-full max-w-none">
          <UsageDashboard
            initialPeriod={DEFAULT_USAGE_PERIOD}
            initialData={data}
          />
        </div>
      </div>
    </div>
  );
}
