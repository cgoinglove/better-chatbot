"use client";

import * as React from "react";
import { Label, Pie, PieChart as RechartsPieChart } from "recharts";

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

// PieChart component props interface
export interface PieChartProps {
  // Chart title (required)
  title: string;
  // Chart data array (required)
  data: Array<{
    label: string; // Item label
    value: number; // Item value
  }>;
  // Value unit (optional, e.g., "visitors", "users", etc.)
  unit?: string;
  // Chart description (optional)
  description?: string;
}

// Color variable names (chart-1 ~ chart-5)
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function PieChart(props: PieChartProps) {
  const { title, data, unit, description } = props;
  // Calculate total value
  const total = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);

  // Generate chart configuration dynamically
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    // Set value unit
    if (unit) {
      config.value = {
        label: unit,
      };
    }

    // Configure each data item
    data.forEach((item, index) => {
      // Colors cycle through chart-1 ~ chart-5
      const colorIndex = index % chartColors.length;
      config[sanitizeCssVariableName(item.label)] = {
        label: item.label,
        color: chartColors[colorIndex],
      };
    });

    return config;
  }, [data, unit]);

  // Generate actual chart data
  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      name: item.label,
      label: item.label,
      value: item.value,
      // Add fill property if needed
      fill: `var(--color-${sanitizeCssVariableName(item.label)})`,
    }));
  }, [data]);

  return (
    <Card className="flex flex-col bg-card">
      <CardHeader className="items-center pb-0 flex flex-col gap-2 relative">
        <CardTitle className="flex items-center">
          Pie Chart - {title}
          <div className="absolute right-4 top-">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <RechartsPieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        {unit && (
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            {unit}
                          </tspan>
                        )}
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </RechartsPieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
