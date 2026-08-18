"use client";

import { getUserAnalyticsAction } from "@/app/api/admin/analytics-actions";
import {
  AdminAnalyticsChartCard,
  AdminAnalyticsChartViewport,
  AdminAnalyticsCharts,
} from "@/components/admin/admin-analytics-charts";
import { AdminUserAnalytics } from "app-types/admin";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "ui/chart";

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

  const periods = [
    { value: "7", label: t("last7Days") },
    { value: "30", label: t("last30Days") },
    { value: "90", label: t("last90Days") },
  ];

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
    <AdminAnalyticsCharts
      title={t("analytics")}
      period={String(days)}
      periods={periods}
      onPeriodChange={handlePeriodChange}
      isPending={isPending}
      periodSelectTestId="analytics-period-select"
      testId="user-analytics-charts"
    >
      <AdminAnalyticsChartCard title={t("userGrowth")}>
        <AdminAnalyticsChartViewport config={growthChartConfig}>
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              fill="var(--color-count)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </AdminAnalyticsChartViewport>
      </AdminAnalyticsChartCard>

      <AdminAnalyticsChartCard title={t("activeUsers")}>
        <AdminAnalyticsChartViewport config={activeChartConfig}>
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
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
        </AdminAnalyticsChartViewport>
      </AdminAnalyticsChartCard>
    </AdminAnalyticsCharts>
  );
}
