import { createPieChartTool } from "./visualization/create-pie-chart";
import { createBarChartTool } from "./visualization/create-bar-chart";
import { createLineChartTool } from "./visualization/create-line-chart";
import { createTableTool } from "./visualization/create-table";
import { exaSearchTool, exaContentsTool } from "./web/web-search";
import { AppDefaultToolkit, DefaultToolName } from ".";
import { Tool } from "ai";
import { httpFetchTool } from "./http/fetch";
import { jsExecutionTool } from "./code/js-run-tool";
import { pythonExecutionTool } from "./code/python-run-tool";
import { searchKnowledgeBase } from "./knowledge-base/search-knowledge-base";
import { e2bSandboxTool } from "./code/e2b-sandbox-tool";
import {
  analyzeDocumentTool,
  editDocumentTool,
} from "./document/analyze-document-tool";
import { createTabularReviewTool } from "./tabular/create-tabular-review-tool";

export const APP_DEFAULT_TOOL_KIT: Record<
  AppDefaultToolkit,
  Record<string, Tool>
> = {
  [AppDefaultToolkit.Visualization]: {
    [DefaultToolName.CreatePieChart]: createPieChartTool,
    [DefaultToolName.CreateBarChart]: createBarChartTool,
    [DefaultToolName.CreateLineChart]: createLineChartTool,
    [DefaultToolName.CreateTable]: createTableTool,
  },
  [AppDefaultToolkit.WebSearch]: {
    [DefaultToolName.WebSearch]: exaSearchTool,
    [DefaultToolName.WebContent]: exaContentsTool,
  },
  [AppDefaultToolkit.Http]: {
    [DefaultToolName.Http]: httpFetchTool,
  },
  [AppDefaultToolkit.Code]: {
    [DefaultToolName.JavascriptExecution]: jsExecutionTool,
    [DefaultToolName.PythonExecution]: pythonExecutionTool,
    [DefaultToolName.E2BSandbox]: e2bSandboxTool,
  },
  [AppDefaultToolkit.KnowledgeBase]: {
    [DefaultToolName.SearchKnowledgeBase]: searchKnowledgeBase(),
  },
  [AppDefaultToolkit.Document]: {
    [DefaultToolName.AnalyzeDocument]: analyzeDocumentTool,
    [DefaultToolName.EditDocument]: editDocumentTool,
  },
  [AppDefaultToolkit.Tabular]: {
    [DefaultToolName.CreateTabularReview]: createTabularReviewTool,
  },
};
