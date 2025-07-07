import { DBEdge, DBNode, DBWorkflow } from "app-types/workflow";
import { generateUUID } from "lib/utils";
import { babyResearchEdges, babyResearchNodes } from "./baby-research";
import { getWeatherEdges, getWeatherNodes } from "./get-weather";

export const GetWeather = (): {
  workflow: Partial<DBWorkflow>;
  nodes: Partial<DBNode>[];
  edges: Partial<DBEdge>[];
} => {
  return {
    workflow: {
      description: "Get weather data from the API",
      name: "Get Weather",
      isPublished: true,
      visibility: "private",
      icon: {
        type: "emoji",
        value:
          "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/26c8-fe0f.png",
        style: {
          backgroundColor: "oklch(20.5% 0 0)",
        },
      },
    },
    nodes: getWeatherNodes,
    edges: getWeatherEdges.map((edge) => ({
      ...edge,
      id: generateUUID(),
    })),
  };
};

export const BabyResearch = (): {
  workflow: Partial<DBWorkflow>;
  nodes: Partial<DBNode>[];
  edges: Partial<DBEdge>[];
} => {
  return {
    workflow: {
      description:
        "Comprehensive web research workflow that performs multi-layered search and content analysis to generate detailed research reports based on user instructions and research objectives.",
      name: "baby-research",
      isPublished: true,
      visibility: "private",
      icon: {
        type: "emoji",
        value:
          "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f468-1f3fb-200d-1f52c.png",
        style: {
          backgroundColor: "oklch(78.5% 0.115 274.713)",
        },
      },
    },
    nodes: babyResearchNodes,
    edges: babyResearchEdges.map((edge) => ({
      ...edge,
      id: generateUUID(),
    })),
  };
};
