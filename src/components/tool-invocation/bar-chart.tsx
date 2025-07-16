"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { JsonViewPopup } from "../json-view-popup";
import { sanitizeCssVariableName } from "./shared.tool-invocation";
import { generateUniqueKey } from "lib/utils";

// BarChart component props interface
export interface BarChartProps {
  // Chart title (required)
  title: string;
  // Chart data array (required)
  data: Array<{
    xAxisLabel: string; // X-axis label name
    series: Array<{
      seriesName: string; // Series name
      value: number; // Value for this series
    }>;
  }>;
  // Chart description (optional)
  description?: string;
  // Y-axis label (optional)
  yAxisLabel?: string;
}

// Color variable names (chart-1 ~ chart-5)
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function BarChart(props: BarChartProps) {
  const { title, data, description, yAxisLabel } = props;

  const deduplicateData = React.useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const names = acc.map((item) => item.xAxisLabel);
        const newXAxisLabel = generateUniqueKey(item.xAxisLabel, names);
        return [
          ...acc,
          {
            xAxisLabel: newXAxisLabel,
            series: item.series.reduce(
              (acc, item) => {
                const names = acc.map((item) => item.seriesName);
                const newSeriesName = generateUniqueKey(item.seriesName, names);
                return [
                  ...acc,
                  {
                    ...item,
                    seriesName: newSeriesName,
                  },
                ];
              },
              [] as BarChartProps["data"][number]["series"],
            ),
          },
        ];
      },
      [] as BarChartProps["data"],
    );
  }, [data]);

  // Get series names from the first data item (assuming all items have the same series)
  const seriesNames =
    deduplicateData[0]?.series.map((item) => item.seriesName) || [];

  // Generate chart configuration dynamically
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    // Configure each series
    seriesNames.forEach((seriesName, index) => {
      // Colors cycle through chart-1 ~ chart-5
      const colorIndex = index % chartColors.length;

      config[sanitizeCssVariableName(seriesName)] = {
        label: seriesName,
        color: chartColors[colorIndex],
      };
    });

    return config;
  }, [seriesNames]);

  // Generate chart data for Recharts
  const chartData = React.useMemo(() => {
    return deduplicateData.map((item) => {
      const result: any = {
        name: item.xAxisLabel,
      };

      // Add each series value to the result
      item.series.forEach(({ seriesName, value }) => {
        result[sanitizeCssVariableName(seriesName)] = value;
      });

      return result;
    });
  }, [deduplicateData]);

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-2 relative">
        <CardTitle className="flex items-center">
          Bar Chart - {title}
          <div className="absolute right-4 top-0">
            <JsonViewPopup
              data={{
                ...props,
                data: deduplicateData,
              }}
            />
          </div>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="400px">
              <RechartsBarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  label={
                    yAxisLabel
                      ? {
                          value: yAxisLabel,
                          angle: -90,
                          position: "insideLeft",
                        }
                      : undefined
                  }
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                {seriesNames.map((seriesName, index) => {
                  return (
                    <Bar
                      key={index}
                      dataKey={sanitizeCssVariableName(seriesName)}
                      fill={`var(--color-${sanitizeCssVariableName(seriesName)})`}
                      radius={4}
                    />
                  );
                })}
              </RechartsBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
