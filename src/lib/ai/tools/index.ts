import { createPieChartTool } from "./create-pie-chart";
import { createBarChartTool } from "./create-bar-chart";
import { createLineChartTool } from "./create-line-chart";
import { getWeather } from "./get-weather";
import { DefaultToolName } from "./utils";
import { AppDefaultToolkit } from "@/types/chat";

export const defaultTools = {
  [AppDefaultToolkit.Visualization]: {
    [DefaultToolName.CreatePieChart]: createPieChartTool,
    [DefaultToolName.CreateBarChart]: createBarChartTool,
    [DefaultToolName.CreateLineChart]: createLineChartTool,
  },
  [AppDefaultToolkit.Weather]: {
    getWeather,
  },
};
