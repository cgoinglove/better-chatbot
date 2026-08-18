"use client";

import { cn } from "lib/utils";
import type { ReactElement, ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { ChartConfig, ChartContainer } from "ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";

interface AnalyticsPeriodOption {
  label: string;
  value: string;
}

interface AdminAnalyticsChartsProps {
  title: string;
  period: string;
  periods: readonly AnalyticsPeriodOption[];
  onPeriodChange: (value: string) => void;
  isPending: boolean;
  periodSelectTestId: string;
  testId: string;
  children: ReactNode;
}

export function AdminAnalyticsCharts({
  title,
  period,
  periods,
  onPeriodChange,
  isPending,
  periodSelectTestId,
  testId,
  children,
}: AdminAnalyticsChartsProps) {
  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger
            size="sm"
            className="w-[160px] max-w-full"
            data-testid={periodSelectTestId}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periods.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "grid gap-4 transition-opacity lg:grid-cols-2",
          isPending && "pointer-events-none opacity-50",
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface AdminAnalyticsChartCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function AdminAnalyticsChartCard({
  title,
  action,
  children,
}: AdminAnalyticsChartCardProps) {
  return (
    <Card className="min-w-0 bg-card">
      <CardHeader
        className={cn(
          action &&
            "flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0",
        )}
      >
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="px-2 sm:px-6">{children}</CardContent>
    </Card>
  );
}

interface AdminAnalyticsChartViewportProps {
  config: ChartConfig;
  children: ReactElement;
}

export function AdminAnalyticsChartViewport({
  config,
  children,
}: AdminAnalyticsChartViewportProps) {
  return (
    <ChartContainer config={config} className="w-full">
      <ResponsiveContainer width="100%" height={240}>
        {children}
      </ResponsiveContainer>
    </ChartContainer>
  );
}
