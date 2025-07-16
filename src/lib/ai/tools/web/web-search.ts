import { tool as createTool } from "ai";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { isString } from "lib/utils";
import { safe } from "ts-safe";

export interface TavilyResponse {
  // Response structure from Tavily API
  query: string;
  follow_up_questions?: Array<string>;
  answer?: string;
  images?: Array<{
    url: string;
    description?: string;
  }>;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
    raw_content?: string;
    favicon?: string;
  }>;
}

export const tavilySearchSchema: JSONSchema7 = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search query",
    },
    search_depth: {
      type: "string",
      enum: ["basic", "advanced"],
      description: "The depth of the search. It can be 'basic' or 'advanced'",
      default: "basic",
    },
    topic: {
      type: "string",
      enum: ["general", "news"],
      description:
        "The category of the search. This will determine which of our agents will be used for the search",
      default: "general",
    },
    days: {
      type: "number",
      description:
        "The number of days back from the current date to include in the search results. This specifies the time frame of data to be retrieved. Please note that this feature is only available when using the 'news' search topic",
      default: 3,
    },
    time_range: {
      type: "string",
      description:
        "The time range back from the current date to include in the search results. This feature is available for both 'general' and 'news' search topics",
      enum: ["day", "week", "month", "year", "d", "w", "m", "y"],
    },
    max_results: {
      type: "number",
      description: "The maximum number of search results to return",
      default: 10,
      minimum: 5,
      maximum: 20,
    },
    include_images: {
      type: "boolean",
      description: "Include a list of query-related images in the response",
      default: true,
    },
    include_image_descriptions: {
      type: "boolean",
      description:
        "Include a list of query-related images and their descriptions in the response",
      default: true,
    },
    include_raw_content: {
      type: "boolean",
      description:
        "Include the cleaned and parsed HTML content of each search result",
      default: false,
    },
    include_domains: {
      type: "array",
      items: { type: "string" },
      description:
        "A list of domains to specifically include in the search results, if the user asks to search on specific sites set this to the domain of the site",
      default: [],
    },
    exclude_domains: {
      type: "array",
      items: { type: "string" },
      description:
        "List of domains to specifically exclude, if the user asks to exclude a domain set this to the domain of the site",
      default: [],
    },
    country: {
      type: "string",
      enum: [
        "afghanistan",
        "albania",
        "algeria",
        "andorra",
        "angola",
        "argentina",
        "armenia",
        "australia",
        "austria",
        "azerbaijan",
        "bahamas",
        "bahrain",
        "bangladesh",
        "barbados",
        "belarus",
        "belgium",
        "belize",
        "benin",
        "bhutan",
        "bolivia",
        "bosnia and herzegovina",
        "botswana",
        "brazil",
        "brunei",
        "bulgaria",
        "burkina faso",
        "burundi",
        "cambodia",
        "cameroon",
        "canada",
        "cape verde",
        "central african republic",
        "chad",
        "chile",
        "china",
        "colombia",
        "comoros",
        "congo",
        "costa rica",
        "croatia",
        "cuba",
        "cyprus",
        "czech republic",
        "denmark",
        "djibouti",
        "dominican republic",
        "ecuador",
        "egypt",
        "el salvador",
        "equatorial guinea",
        "eritrea",
        "estonia",
        "ethiopia",
        "fiji",
        "finland",
        "france",
        "gabon",
        "gambia",
        "georgia",
        "germany",
        "ghana",
        "greece",
        "guatemala",
        "guinea",
        "haiti",
        "honduras",
        "hungary",
        "iceland",
        "india",
        "indonesia",
        "iran",
        "iraq",
        "ireland",
        "israel",
        "italy",
        "jamaica",
        "japan",
        "jordan",
        "kazakhstan",
        "kenya",
        "kuwait",
        "kyrgyzstan",
        "latvia",
        "lebanon",
        "lesotho",
        "liberia",
        "libya",
        "liechtenstein",
        "lithuania",
        "luxembourg",
        "madagascar",
        "malawi",
        "malaysia",
        "maldives",
        "mali",
        "malta",
        "mauritania",
        "mauritius",
        "mexico",
        "moldova",
        "monaco",
        "mongolia",
        "montenegro",
        "morocco",
        "mozambique",
        "myanmar",
        "namibia",
        "nepal",
        "netherlands",
        "new zealand",
        "nicaragua",
        "niger",
        "nigeria",
        "north korea",
        "north macedonia",
        "norway",
        "oman",
        "pakistan",
        "panama",
        "papua new guinea",
        "paraguay",
        "peru",
        "philippines",
        "poland",
        "portugal",
        "qatar",
        "romania",
        "russia",
        "rwanda",
        "saudi arabia",
        "senegal",
        "serbia",
        "singapore",
        "slovakia",
        "slovenia",
        "somalia",
        "south africa",
        "south korea",
        "south sudan",
        "spain",
        "sri lanka",
        "sudan",
        "sweden",
        "switzerland",
        "syria",
        "taiwan",
        "tajikistan",
        "tanzania",
        "thailand",
        "togo",
        "trinidad and tobago",
        "tunisia",
        "turkey",
        "turkmenistan",
        "uganda",
        "ukraine",
        "united arab emirates",
        "united kingdom",
        "united states",
        "uruguay",
        "uzbekistan",
        "venezuela",
        "vietnam",
        "yemen",
        "zambia",
        "zimbabwe",
      ],
      description:
        "Boost search results from a specific country. This will prioritize content from the selected country in the search results. Available only if topic is general.",
      default: "",
    },
    include_favicon: {
      type: "boolean",
      description: "Whether to include the favicon URL for each result",
      default: true,
    },
  },
  required: ["query"],
};

export const tavilyWebContentSchema: JSONSchema7 = {
  type: "object",
  properties: {
    urls: {
      type: "array",
      items: { type: "string" },
      description: "List of URLs to extract content from",
    },
    extract_depth: {
      type: "string",
      enum: ["basic", "advanced"],
      description:
        "Depth of extraction - 'basic' or 'advanced', if usrls are linkedin use 'advanced' or if explicitly told to use advanced",
      default: "basic",
    },
    include_images: {
      type: "boolean",
      description:
        "Include a list of images extracted from the urls in the response",
      default: false,
    },
    format: {
      type: "string",
      enum: ["markdown", "text"],
      description:
        "The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.",
      default: "markdown",
    },
    include_favicon: {
      type: "boolean",
      description: "Whether to include the favicon URL for each result",
      default: false,
    },
  },
  required: ["urls"],
};

const API_KEY = process.env.TAVILY_API_KEY;

const baseURLs = {
  search: "https://api.tavily.com/search",
  extract: "https://api.tavily.com/extract",
} as const;

const fetchTavily = async (url: string, body: any): Promise<TavilyResponse> => {
  if (!API_KEY) {
    throw new Error("Tavily API key is not configured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      ...body,
      api_key: API_KEY,
    }),
  });

  if (response.status === 401) {
    throw new Error("Invalid TavilyAPI key");
  }
  if (response.status === 429) {
    throw new Error("Tavily API usage limit exceeded");
  }

  if (!response.ok) {
    throw new Error(
      `Tavily API error: ${response.status} ${response.statusText}`,
    );
  }

  const result: TavilyResponse = await response.json();
  return {
    ...result,
    images: result.images?.map((image) => ({
      url: isString(image) ? image : image.url,
      description: image.description,
    })),
  };
};

export const tavilySearchToolForWorkflow = createTool({
  description:
    "A web search tool for quick research and information gathering. Provides basic search results with titles, summaries, and URLs from across the web. Perfect for finding relevant sources and getting an overview of topics.",
  parameters: jsonSchemaToZod(tavilySearchSchema),
  execute: async (params) => {
    return fetchTavily(baseURLs.search, {
      ...params,
      topic: params.country ? "general" : params.topic,
      include_favicon: false,
      include_domains: Array.isArray(params.include_domains)
        ? params.include_domains
        : [],
      exclude_domains: Array.isArray(params.exclude_domains)
        ? params.exclude_domains
        : [],
    });
  },
});

export const tavilyWebContentToolForWorkflow = createTool({
  description:
    "A detailed web content extraction tool that analyzes and summarizes specific web pages from provided URLs. Extracts full content, processes it intelligently, and provides comprehensive summaries. Perfect for in-depth analysis of specific articles, documents, or web pages.",
  parameters: jsonSchemaToZod(tavilyWebContentSchema),
  execute: async (params) => {
    return fetchTavily(baseURLs.extract, {
      ...params,
      include_favicon: false,
      include_images: true,
      include_image_descriptions: true,
      include_raw_content: false,
    });
  },
});

export const tavilySearchTool = createTool({
  description:
    "A web search tool for quick research and information gathering. Provides basic search results with titles, summaries, and URLs from across the web. Perfect for finding relevant sources and getting an overview of topics.",
  parameters: jsonSchemaToZod(tavilySearchSchema),
  execute: (params) => {
    return safe(() =>
      fetchTavily(baseURLs.search, {
        ...params,
        topic: params.country ? "general" : params.topic,
        include_favicon: true,
        include_domains: Array.isArray(params.include_domains)
          ? params.include_domains
          : [],
        exclude_domains: Array.isArray(params.exclude_domains)
          ? params.exclude_domains
          : [],
        include_images: true,
        include_image_descriptions: true,
      }),
    )
      .map((result) => ({
        ...result,
        guide: `Use the search results to answer the user's question. Summarize the content and ask if they have any additional questions about the topic.`,
      }))
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

export const tavilyWebContentTool = createTool({
  description:
    "A detailed web content extraction tool that analyzes and summarizes specific web pages from provided URLs. Extracts full content, processes it intelligently, and provides comprehensive summaries. Perfect for in-depth analysis of specific articles, documents, or web pages.",
  parameters: jsonSchemaToZod(tavilyWebContentSchema),
  execute: async (params) => {
    return safe(() =>
      fetchTavily(baseURLs.extract, {
        ...params,
        include_favicon: true,
      }),
    )
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
