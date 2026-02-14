import type { VerticalDefinition } from "app-types/platform";
import { salesHunterAgentDefaults } from "./agents";
import { salesHunterMetrics } from "./metrics";

export const salesHunterVertical: VerticalDefinition = {
  id: "sales-hunter",
  name: "Sales Hunter",
  description:
    "AI-powered sales prospecting, qualification, and pipeline management",
  icon: "target",
  defaultAgents: salesHunterAgentDefaults,
  metrics: salesHunterMetrics,
  connectorTypes: ["salesforce", "hubspot", "csv-import"],
  dashboardConfig: {
    widgets: [
      { type: "pipeline-value", position: { x: 0, y: 0, w: 6, h: 2 } },
      {
        type: "lead-score-distribution",
        position: { x: 6, y: 0, w: 6, h: 2 },
      },
      { type: "conversion-funnel", position: { x: 0, y: 2, w: 4, h: 3 } },
      { type: "activity-timeline", position: { x: 4, y: 2, w: 8, h: 3 } },
      { type: "roi-summary", position: { x: 0, y: 5, w: 12, h: 2 } },
    ],
  },
};
