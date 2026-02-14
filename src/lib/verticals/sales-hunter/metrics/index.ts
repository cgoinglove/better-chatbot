import type { VerticalMetricDefinition } from "app-types/platform";

export const salesHunterMetrics: VerticalMetricDefinition[] = [
  {
    key: "pipeline_value",
    name: "Pipeline Value",
    description: "Total estimated value of all active deals",
    unit: "USD",
    aggregation: "sum",
  },
  {
    key: "leads_generated",
    name: "Leads Generated",
    description: "Number of new leads created by AI",
    unit: "count",
    aggregation: "sum",
  },
  {
    key: "leads_qualified",
    name: "Leads Qualified",
    description: "Number of leads that passed qualification",
    unit: "count",
    aggregation: "sum",
  },
  {
    key: "conversion_rate",
    name: "Conversion Rate",
    description: "Percentage of leads that converted to opportunities",
    unit: "percent",
    aggregation: "avg",
  },
  {
    key: "avg_deal_size",
    name: "Average Deal Size",
    description: "Average estimated value per opportunity",
    unit: "USD",
    aggregation: "avg",
  },
  {
    key: "pipeline_velocity",
    name: "Pipeline Velocity",
    description: "Average days from lead to close",
    unit: "days",
    aggregation: "avg",
  },
  {
    key: "response_time",
    name: "Response Time",
    description: "Average time to first outreach after lead creation",
    unit: "hours",
    aggregation: "avg",
  },
  {
    key: "win_rate",
    name: "Win Rate",
    description: "Percentage of opportunities that closed won",
    unit: "percent",
    aggregation: "avg",
  },
  {
    key: "ai_actions",
    name: "AI Actions",
    description: "Number of AI-powered actions taken",
    unit: "count",
    aggregation: "sum",
  },
  {
    key: "roi_multiplier",
    name: "ROI Multiplier",
    description: "Revenue generated per dollar spent on platform",
    unit: "x",
    aggregation: "latest",
  },
];
