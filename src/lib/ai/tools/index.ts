import { createPieChartTool } from "./create-pie-chart";
import { createBarChartTool } from "./create-bar-chart";
import { createLineChartTool } from "./create-line-chart";
import { DefaultToolName } from "./utils";
export const defaultTools = {
  [DefaultToolName.CreatePieChart]: createPieChartTool,
  [DefaultToolName.CreateBarChart]: createBarChartTool,
  [DefaultToolName.CreateLineChart]: createLineChartTool,
};
