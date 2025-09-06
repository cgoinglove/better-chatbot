import { tool } from "ai";
import { z } from "zod";
import { safe } from "ts-safe";

// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: string;
  category?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults: number;
  contents: {
    text:
      | {
          maxCharacters?: number;
        }
      | boolean;
    livecrawl?: "always" | "fallback" | "preferred";
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString: string;
  resolvedSearchType: string;
  results: ExaSearchResult[];
}

export interface ExaContentsRequest {
  ids: string[];
  contents: {
    text:
      | {
          maxCharacters?: number;
        }
      | boolean;
    livecrawl?: "always" | "fallback" | "preferred";
  };
}

const API_KEY = process.env.EXA_API_KEY;
const BASE_URL = "https://api.exa.ai";

const fetchExa = async (endpoint: string, body: any): Promise<any> => {
  if (!API_KEY) {
    throw new Error("EXA_API_KEY is not configured");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new Error("Invalid EXA API key");
  }
  if (response.status === 429) {
    throw new Error("Exa API usage limit exceeded");
  }

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

export const webSearchTool = tool({
  description:
    "Search the web using Exa AI - performs real-time web searches with semantic and neural search capabilities. Returns high-quality, relevant results with full content extraction.",
  parameters: z.object({
    query: z.string().describe("Search query"),
    numResults: z
      .number()
      .min(1)
      .max(20)
      .default(5)
      .describe("Number of search results to return"),
    type: z
      .enum(["auto", "keyword", "neural"])
      .default("auto")
      .describe(
        "Search type - auto lets Exa decide, keyword for exact matches, neural for semantic search",
      ),
    category: z
      .enum([
        "company",
        "research paper",
        "news",
        "linkedin profile",
        "github",
        "tweet",
        "movie",
        "song",
        "personal site",
        "pdf",
      ])
      .optional()
      .describe("Category to focus the search on"),
    includeDomains: z
      .array(z.string())
      .default([])
      .describe("List of domains to specifically include in search results"),
    excludeDomains: z
      .array(z.string())
      .default([])
      .describe("List of domains to specifically exclude from search results"),
    startPublishedDate: z
      .string()
      .optional()
      .describe("Start date for published content (YYYY-MM-DD format)"),
    endPublishedDate: z
      .string()
      .optional()
      .describe("End date for published content (YYYY-MM-DD format)"),
    maxCharacters: z
      .number()
      .min(100)
      .max(10000)
      .default(3000)
      .describe("Maximum characters to extract from each result"),
  }),
  execute: (params) => {
    return safe(async () => {
      const searchRequest: ExaSearchRequest = {
        query: params.query,
        type: params.type || "auto",
        numResults: params.numResults || 5,
        contents: {
          text: {
            maxCharacters: params.maxCharacters || 3000,
          },
          livecrawl: "preferred",
        },
      };

      // Add optional parameters if provided
      if (params.category) searchRequest.category = params.category;
      if (params.includeDomains?.length)
        searchRequest.includeDomains = params.includeDomains;
      if (params.excludeDomains?.length)
        searchRequest.excludeDomains = params.excludeDomains;
      if (params.startPublishedDate)
        searchRequest.startPublishedDate = params.startPublishedDate;
      if (params.endPublishedDate)
        searchRequest.endPublishedDate = params.endPublishedDate;

      const result = await fetchExa("/search", searchRequest);

      return {
        ...result,
        guide: `Use the search results to answer the user's question. Summarize the content and ask if they have any additional questions about the topic.`,
      };
    })
      .ifFail((e) => {
        return {
          isError: true,
          error: e.message,
          solution:
            "A web search error occurred. First, explain to the user what caused this specific error and how they can resolve it. Then provide helpful information based on your existing knowledge to answer their question.",
        };
      })
      .unwrap();
  },
});

export const webContentsTool = tool({
  description:
    "Extract detailed content from specific URLs using Exa AI - retrieves full text content, metadata, and structured information from web pages with live crawling capabilities.",
  parameters: z.object({
    urls: z
      .array(z.string())
      .describe("List of URLs to extract content from"),
    maxCharacters: z
      .number()
      .min(100)
      .max(10000)
      .default(3000)
      .describe("Maximum characters to extract from each URL"),
    livecrawl: z
      .enum(["always", "fallback", "preferred"])
      .default("preferred")
      .describe(
        "Live crawling preference - always forces live crawl, fallback uses cache first, preferred tries live first",
      ),
  }),
  execute: async (params) => {
    return safe(async () => {
      const contentsRequest: ExaContentsRequest = {
        ids: params.urls,
        contents: {
          text: {
            maxCharacters: params.maxCharacters || 3000,
          },
          livecrawl: params.livecrawl || "preferred",
        },
      };

      return await fetchExa("/contents", contentsRequest);
    })
      .ifFail((e) => {
        return {
          isError: true,
          error: e.message,
          solution:
            "A web content extraction error occurred. First, explain to the user what caused this specific error and how they can resolve it. Then provide helpful information based on your existing knowledge to answer their question.",
        };
      })
      .unwrap();
  },
});