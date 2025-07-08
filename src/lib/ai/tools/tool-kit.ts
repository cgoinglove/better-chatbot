import { createPieChartTool } from "./visualization/create-pie-chart";
import { createBarChartTool } from "./visualization/create-bar-chart";
import { createLineChartTool } from "./visualization/create-line-chart";
import { tavilySearchTool, tavilyWebContentTool } from "./web/web-search";
import { AppDefaultToolkit, DefaultToolName } from ".";
import { Tool } from "ai";
import { httpFetchTool } from "./http/fetch";

export const APP_DEFAULT_TOOL_KIT: Record<
  AppDefaultToolkit,
  Record<string, Tool>
> = {
  [AppDefaultToolkit.Visualization]: {
    [DefaultToolName.CreatePieChart]: createPieChartTool,
    [DefaultToolName.CreateBarChart]: createBarChartTool,
    [DefaultToolName.CreateLineChart]: createLineChartTool,
  },
  [AppDefaultToolkit.WebSearch]: {
    [DefaultToolName.WebSearch]: tavilySearchTool,
    [DefaultToolName.WebContent]: tavilyWebContentTool,
  },
  [AppDefaultToolkit.Http]: {
    [DefaultToolName.Http]: httpFetchTool,
  },
};
