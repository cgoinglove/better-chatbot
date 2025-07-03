import { tool as createTool } from "ai";
import { z } from "zod";

export interface TavilyResponse {
  // Response structure from Tavily API
  query: string;
  follow_up_questions?: Array<string>;
  answer?: string;
  images?: Array<
    | string
    | {
        url: string;
        description?: string;
      }
  >;
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

export const tavilySearchSchema = z.object({
  query: z.string().describe("Search query"),
  search_depth: z
    .enum(["basic", "advanced"])
    .default("basic")
    .describe("The depth of the search. It can be 'basic' or 'advanced'"),
  topic: z
    .enum(["general", "news"])
    .default("general")
    .describe(
      "The category of the search. This will determine which of our agents will be used for the search",
    ),
  days: z
    .number()
    .default(3)
    .describe(
      "The number of days back from the current date to include in the search results. This specifies the time frame of data to be retrieved. Please note that this feature is only available when using the 'news' search topic",
    ),
  time_range: z
    .enum(["day", "week", "month", "year", "d", "w", "m", "y"])
    .optional()
    .describe(
      "The time range back from the current date to include in the search results. This feature is available for both 'general' and 'news' search topics",
    ),
  max_results: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe("The maximum number of search results to return"),
  include_images: z
    .boolean()
    .default(false)
    .describe("Include a list of query-related images in the response"),
  include_image_descriptions: z
    .boolean()
    .default(false)
    .describe(
      "Include a list of query-related images and their descriptions in the response",
    ),
  include_raw_content: z
    .boolean()
    .default(false)
    .describe(
      "Include the cleaned and parsed HTML content of each search result",
    ),
  include_domains: z
    .array(z.string())
    .default([])
    .describe(
      "A list of domains to specifically include in the search results, if the user asks to search on specific sites set this to the domain of the site",
    ),
  exclude_domains: z
    .array(z.string())
    .default([])
    .describe(
      "List of domains to specifically exclude, if the user asks to exclude a domain set this to the domain of the site",
    ),
  country: z
    .enum([
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
    ])
    .optional()
    .describe(
      "Boost search results from a specific country. This will prioritize content from the selected country in the search results. Available only if topic is general.",
    ),
  include_favicon: z
    .boolean()
    .default(false)
    .describe("Whether to include the favicon URL for each result"),
});

export const tavilyExtractSchema = z.object({
  urls: z.array(z.string()).describe("List of URLs to extract content from"),
  extract_depth: z
    .enum(["basic", "advanced"])
    .default("basic")
    .describe(
      "Depth of extraction - 'basic' or 'advanced', if urls are linkedin use 'advanced' or if explicitly told to use advanced",
    ),
  include_images: z
    .boolean()
    .default(false)
    .describe(
      "Include a list of images extracted from the urls in the response",
    ),
  format: z
    .enum(["markdown", "text"])
    .default("markdown")
    .describe(
      "The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.",
    ),
  include_favicon: z
    .boolean()
    .default(false)
    .describe("Whether to include the favicon URL for each result"),
});

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

  return response.json() as Promise<TavilyResponse>;
};

export const tavilySearchTool = createTool({
  description:
    "A powerful web search tool that provides comprehensive, real-time results using Tavily's AI search engine. Returns relevant web content with customizable parameters for result count, content type, and domain filtering. Ideal for gathering current information, news, and detailed web content analysis.",
  parameters: tavilySearchSchema,
  execute: async (params) => {
    return fetchTavily(baseURLs.search, {
      ...params,
      topic: params.country ? "general" : params.topic,
      include_favicon: true,
      include_domains: Array.isArray(params.include_domains)
        ? params.include_domains
        : [],
      exclude_domains: Array.isArray(params.exclude_domains)
        ? params.exclude_domains
        : [],
    });
  },
});

export const tavilyExtractTool = createTool({
  description:
    "A powerful web content extraction tool that retrieves and processes raw content from specified URLs, ideal for data collection, content analysis, and research tasks.",
  parameters: tavilyExtractSchema,
  execute: async (params) => {
    return fetchTavily(baseURLs.extract, {
      ...params,
      include_favicon: true,
    });
  },
});
