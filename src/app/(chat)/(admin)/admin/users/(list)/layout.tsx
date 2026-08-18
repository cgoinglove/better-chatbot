import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { getTranslations } from "next-intl/server";
import {
  DEFAULT_ANALYTICS_WINDOW_DAYS,
  getAdminUserAnalytics,
  getAdminUserRoleCounts,
} from "lib/admin/server";
import { UserRoleStats } from "@/components/admin/user-role-stats";
import { UserAnalyticsCharts } from "@/components/admin/user-analytics-charts";

interface UsersLayoutProps {
  children: ReactNode;
}

export default async function UsersLayout({ children }: UsersLayoutProps) {
  const t = await getTranslations("Admin.Users");

  const [roleCounts, analytics] = await Promise.all([
    getAdminUserRoleCounts(),
    getAdminUserAnalytics(DEFAULT_ANALYTICS_WINDOW_DAYS),
  ]);

  return (
    <div className="relative bg-background w-full flex flex-col min-h-screen">
      <div className="flex-1 overflow-y-auto p-6 w-full">
        <div className="space-y-6 w-full max-w-none">
          <UserRoleStats counts={roleCounts} />
          <UserAnalyticsCharts
            initialDays={DEFAULT_ANALYTICS_WINDOW_DAYS}
            initialData={analytics}
          />

          {/* Main Card */}
          <Card className="w-full border-none bg-transparent">
            <CardHeader>
              <CardTitle className="text-2xl">{t("allUsers")}</CardTitle>
              <CardDescription>{t("viewAndManageUsers")}</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6 w-full">{children}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
