"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { useTranslations } from "next-intl";
import { AdminUsageOverview, AdminUsagePeriod } from "app-types/admin";
import { getUsageOverviewAction } from "@/app/api/admin/usage-actions";
import { UsageStatTiles } from "@/components/admin/usage-stat-tiles";
import { UsageCharts } from "@/components/admin/usage-charts";
import { ModelUsageTable } from "@/components/admin/model-usage-table";
import { cn } from "lib/utils";

interface UsageDashboardProps {
  initialPeriod: AdminUsagePeriod;
  initialData: AdminUsageOverview;
}

export function UsageDashboard({
  initialPeriod,
  initialData,
}: UsageDashboardProps) {
  const t = useTranslations("Admin.Usage");
  const [period, setPeriod] = useState<AdminUsagePeriod>(initialPeriod);
  const [data, setData] = useState<AdminUsageOverview>(initialData);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (value: string) => {
    const nextPeriod = value as AdminUsagePeriod;
    setPeriod(nextPeriod);
    startTransition(async () => {
      const result = await getUsageOverviewAction(nextPeriod);
      setData(result);
    });
  };

  const usedModelCount = data.models.filter((m) => m.messageCount > 0).length;

  return (
    <div className="space-y-6" data-testid="usage-dashboard">
      <div
        className={cn(
          "transition-opacity",
          isPending && "opacity-50 pointer-events-none",
        )}
      >
        <UsageStatTiles
          totals={data.totals}
          usedModelCount={usedModelCount}
          availableModelCount={data.availableModelCount}
        />
      </div>

      <UsageCharts
        period={period}
        onPeriodChange={handlePeriodChange}
        timeline={data.timeline}
        models={data.models}
        isPending={isPending}
      />

      {/* Main Card */}
      <Card className="w-full border-none bg-transparent">
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-2 md:p-6 w-full">
          <div
            className={cn(
              "transition-opacity",
              isPending && "opacity-50 pointer-events-none",
            )}
          >
            <ModelUsageTable models={data.models} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
