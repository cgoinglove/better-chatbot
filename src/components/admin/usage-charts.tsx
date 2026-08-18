"use client";

import {
  AdminAnalyticsChartCard,
  AdminAnalyticsChartViewport,
  AdminAnalyticsCharts,
} from "@/components/admin/admin-analytics-charts";
import {
  ADMIN_USAGE_PERIODS,
  AdminUsageOverview,
  AdminUsagePeriod,
} from "app-types/admin";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import { ChartConfig, ChartTooltip, ChartTooltipContent } from "ui/chart";
import { Tabs, TabsList, TabsTrigger } from "ui/tabs";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type TimelineMetric = "messages" | "tokens";

interface UsageChartsProps {
  period: AdminUsagePeriod;
  onPeriodChange: (value: string) => void;
  timeline: AdminUsageOverview["timeline"];
  models: AdminUsageOverview["models"];
  isPending: boolean;
}

export function UsageCharts({
  period,
  onPeriodChange,
  timeline,
  models,
  isPending,
}: UsageChartsProps) {
  const t = useTranslations("Admin.Usage");
  const [metric, setMetric] = useState<TimelineMetric>("messages");

  const periodLabels: Record<AdminUsagePeriod, string> = {
    "7": t("last7Days"),
    "30": t("last30Days"),
    "90": t("last90Days"),
    all: t("allTime"),
  };
  const periods = ADMIN_USAGE_PERIODS.map((value) => ({
    value,
    label: periodLabels[value],
  }));

  const timelineConfig: ChartConfig = useMemo(
    () => ({
      messages: { label: t("messages"), color: "var(--chart-1)" },
      tokens: { label: t("tokens"), color: "var(--chart-2)" },
    }),
    [t],
  );

  const timelineData = useMemo(
    () =>
      timeline.map((point) => ({
        date: point.date,
        label: format(parseISO(point.date), "MMM d"),
        messages: point.messages,
        tokens: point.tokens,
      })),
    [timeline],
  );

  const topModels = useMemo(
    () =>
      models
        .filter((m) => m.messageCount > 0)
        .slice(0, 8)
        .map((m) => ({
          model: m.model,
          tokens: m.totalTokens,
        })),
    [models],
  );

  const modelsConfig: ChartConfig = useMemo(
    () => ({
      tokens: { label: t("tokens"), color: "var(--chart-1)" },
    }),
    [t],
  );

  return (
    <AdminAnalyticsCharts
      title={t("analytics")}
      period={period}
      periods={periods}
      onPeriodChange={onPeriodChange}
      isPending={isPending}
      periodSelectTestId="usage-period-select"
      testId="usage-charts"
    >
      <AdminAnalyticsChartCard
        title={t("activityOverTime")}
        action={
          <Tabs
            value={metric}
            onValueChange={(value) => setMetric(value as TimelineMetric)}
          >
            <TabsList>
              <TabsTrigger value="messages">{t("messages")}</TabsTrigger>
              <TabsTrigger value="tokens">{t("tokens")}</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <AdminAnalyticsChartViewport config={timelineConfig}>
          <AreaChart data={timelineData}>
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
              width={40}
              allowDecimals={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={`var(--color-${metric})`}
              fill={`var(--color-${metric})`}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </AdminAnalyticsChartViewport>
      </AdminAnalyticsChartCard>

      <AdminAnalyticsChartCard title={t("topModelsByTokens")}>
        {topModels.length > 0 ? (
          <AdminAnalyticsChartViewport config={modelsConfig}>
            <BarChart data={topModels} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="model"
                width={90}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) =>
                  value.length > 14 ? `${value.slice(0, 13)}…` : value
                }
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="tokens" radius={4}>
                {topModels.map((entry, index) => (
                  <Cell
                    key={entry.model}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </AdminAnalyticsChartViewport>
        ) : (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            {t("noUsageYet")}
          </div>
        )}
      </AdminAnalyticsChartCard>
    </AdminAnalyticsCharts>
  );
}
