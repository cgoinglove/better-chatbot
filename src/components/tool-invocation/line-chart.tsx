"use client";

import * as React from "react";

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  Legend,
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
// LineChart component props interface
export interface LineChartProps {
  // Chart title (required)
  title: string;
  // Chart data array (required)
  data: Array<{
    xAxisLabel: string; // X-axis point label (e.g. date, month, category)
    series: Array<{
      seriesName: string; // Line series name
      value: number; // Value at this point
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

export function LineChart(props: LineChartProps) {
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
              [] as LineChartProps["data"][number]["series"],
            ),
          },
        ];
      },
      [] as LineChartProps["data"],
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
        label: item.xAxisLabel,
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
          Line Chart - {title}
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
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
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
                  content={<ChartTooltipContent />}
                />
                <Legend />
                {seriesNames.map((seriesName, index) => (
                  <Line
                    key={index}
                    type="monotone"
                    name={seriesName}
                    dataKey={sanitizeCssVariableName(seriesName)}
                    stroke={`var(--color-${sanitizeCssVariableName(seriesName)})`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
