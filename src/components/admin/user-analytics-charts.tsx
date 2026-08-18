"use client";

import { useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "ui/chart";
import { useTranslations } from "next-intl";
import { AdminUserAnalytics } from "app-types/admin";
import { getUserAnalyticsAction } from "@/app/api/admin/analytics-actions";
import { cn } from "lib/utils";

const PERIODS = [7, 30, 90] as const;

interface UserAnalyticsChartsProps {
  initialDays: number;
  initialData: AdminUserAnalytics;
}

export function UserAnalyticsCharts({
  initialDays,
  initialData,
}: UserAnalyticsChartsProps) {
  const t = useTranslations("Admin.Users");
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const periodLabels: Record<(typeof PERIODS)[number], string> = {
    7: t("last7Days"),
    30: t("last30Days"),
    90: t("last90Days"),
  };

  const growthChartConfig: ChartConfig = useMemo(
    () => ({
      count: {
        label: t("userGrowth"),
        color: "var(--chart-1)",
      },
    }),
    [t],
  );

  const activeChartConfig: ChartConfig = useMemo(
    () => ({
      count: {
        label: t("activeUsers"),
        color: "var(--chart-2)",
      },
      twoDayStreak: {
        label: t("twoDayStreak"),
        color: "#f97316",
      },
      threeDayStreak: {
        label: t("threeDayStreak"),
        color: "#d946ef",
      },
    }),
    [t],
  );

  const growthData = useMemo(
    () =>
      data.growth.map((point) => ({
        date: point.date,
        label: format(parseISO(point.date), "MMM d"),
        count: point.count,
      })),
    [data.growth],
  );

  const activeData = useMemo(
    () =>
      data.activeUsers.map((point) => ({
        date: point.date,
        label: format(parseISO(point.date), "MMM d"),
        count: point.count,
        twoDayStreak:
          data.twoDayStreakUsers.find(
            (streakPoint) => streakPoint.date === point.date,
          )?.count ?? 0,
        threeDayStreak:
          data.threeDayStreakUsers.find(
            (streakPoint) => streakPoint.date === point.date,
          )?.count ?? 0,
      })),
    [data.activeUsers, data.threeDayStreakUsers, data.twoDayStreakUsers],
  );

  const handlePeriodChange = (value: string) => {
    const nextDays = Number(value);
    setDays(nextDays);
    startTransition(async () => {
      const result = await getUserAnalyticsAction(nextDays);
      setData(result);
    });
  };

  return (
    <div className="space-y-3" data-testid="user-analytics-charts">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("analytics")}
        </h3>
        <Select value={String(days)} onValueChange={handlePeriodChange}>
          <SelectTrigger
            size="sm"
            className="w-[160px]"
            data-testid="analytics-period-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((period) => (
              <SelectItem key={period} value={String(period)}>
                {periodLabels[period]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "grid gap-4 lg:grid-cols-2 transition-opacity",
          isPending && "opacity-50 pointer-events-none",
        )}
      >
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">{t("userGrowth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={growthChartConfig}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={32}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    fill="var(--color-count)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">{t("activeUsers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activeChartConfig}>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={activeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={32}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  <Line
                    type="monotone"
                    dataKey="twoDayStreak"
                    stroke="var(--color-twoDayStreak)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="threeDayStreak"
                    stroke="var(--color-threeDayStreak)"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
