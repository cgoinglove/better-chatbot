import { DBEdge, DBNode } from "app-types/workflow";
import { generateUUID } from "lib/utils";

const INPUT = generateUUID();
const INITIAL_SEARCH = generateUUID();
const URL_CONDITION = generateUUID();
const CONTENT_EXTRACTION = generateUUID();
const SUMMARY = generateUUID();
const SEARCH_CONDITION = generateUUID();
const ADDITIONAL_SEARCH = generateUUID();
const OUTPUT = generateUUID();
const ORGANIZATION = generateUUID();
const REPORT_GUIDE = generateUUID();
const ANALYSIS = generateUUID();

export const babyResearchNodes: Partial<DBNode>[] = [
  {
    id: INITIAL_SEARCH,

    kind: "tool",
    name: "INITIAL_SEARCH",
    description:
      "Perform initial web search based on user query and parameters",
    uiConfig: { position: { x: 360, y: 0 }, type: "default" },
    nodeConfig: {
      kind: "tool",
      outputSchema: {
        type: "object",
        properties: { tool_result: { type: "object" } },
      },
      model: { provider: "openai", model: "4o" },
      message: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Based on the following research instruction, perform a comprehensive web search:",
              },
              { type: "hardBreak" },
            ],
          },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "- **Research Instruction**: " },
                      {
                        type: "mention",
                        attrs: {
                          id: "20075100-6d14-42ea-ac7a-a2732d54cacf",
                          label: `{"nodeId":"${INPUT}","path":["research_instruction"]}`,
                        },
                      },
                      { type: "hardBreak" },
                      { type: "hardBreak" },
                      { type: "text", text: "---" },
                      { type: "hardBreak" },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "- **Topic Area**: " },
                      {
                        type: "mention",
                        attrs: {
                          id: "e279fc2c-43c3-441d-bb5d-2d084a74bd63",
                          label: `{"nodeId":"${INPUT}","path":["topic"]}`,
                        },
                      },
                      { type: "hardBreak" },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "- Search Strategy:" }],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  1. Extract key concepts and themes from the research instruction",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  2. Identify multiple search angles and perspectives",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  3. Use diverse keywords and search terms",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  4. Focus on finding authoritative and comprehensive sources",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  5. Include recent developments and established knowledge",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  6. Cast a wide net to ensure comprehensive coverage",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  Important: Don't limit yourself to obvious keywords. Consider:",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  - Technical terminology and industry jargon",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "  - Alternative names and concepts" },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  - Related fields and cross-industry applications",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "  - Recent trends and developments" },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "  - Expert opinions and case studies" },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  Return maximum 15 diverse, high-quality results.",
              },
            ],
          },
        ],
      },
      tool: {
        type: "app-tool",
        id: "webSearch",
        description:
          "A web search tool for quick research and information gathering. Provides basic search results with titles, summaries, and URLs from across the web. Perfect for finding relevant sources and getting an overview of topics.",
        parameterSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            search_depth: {
              type: "string",
              enum: ["basic", "advanced"],
              description:
                "The depth of the search. It can be 'basic' or 'advanced'",
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
              description:
                "Include a list of query-related images in the response",
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
        },
      },
    },
  },
  {
    id: URL_CONDITION,

    kind: "condition",
    name: "URL_CONDITION",
    description: "",
    uiConfig: {
      position: { x: 1092.720830684793, y: -109.56839983927273 },
      type: "default",
    },
    nodeConfig: {
      kind: "condition",
      outputSchema: { type: "object", properties: {} },
      branches: {
        if: {
          id: "if",
          logicalOperator: "AND",
          type: "if",
          conditions: [
            {
              source: {
                nodeId: ANALYSIS,
                path: ["answer", "important_url"],
                nodeName: "ANALYSIS",
                type: "object",
              },
              operator: "is_not_empty",
            },
          ],
        },
        else: {
          id: "else",
          logicalOperator: "AND",
          type: "else",
          conditions: [],
        },
      },
    },
  },
  {
    id: CONTENT_EXTRACTION,

    kind: "tool",
    name: "CONTENT_EXTRACTION",
    description: "Extract detailed content from important URL",
    uiConfig: {
      position: { x: 1426.344044454295, y: -203.77120780533727 },
      type: "default",
    },
    nodeConfig: {
      kind: "tool",
      outputSchema: {
        type: "object",
        properties: { tool_result: { type: "object" } },
      },
      model: { provider: "openai", model: "4o" },
      message: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "url : " },
              {
                type: "mention",
                attrs: {
                  id: "9bd55c87-9eac-4af2-968f-c83b93577639",
                  label: `{"nodeId":"${ANALYSIS}","path":["answer","important_url"]}`,
                },
              },
            ],
          },
        ],
      },
      tool: {
        type: "app-tool",
        id: "webContent",
        description:
          "A detailed web content extraction tool that analyzes and summarizes specific web pages from provided URLs. Extracts full content, processes it intelligently, and provides comprehensive summaries. Perfect for in-depth analysis of specific articles, documents, or web pages.",
        parameterSchema: {
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
        },
      },
    },
  },
  {
    id: SUMMARY,

    kind: "llm",
    name: "SUMMARY",
    description:
      "Synthesize all information into comprehensive research report",
    uiConfig: {
      position: { x: 1912.4044439691656, y: 29.67494745840466 },
      type: "default",
    },
    nodeConfig: {
      kind: "llm",
      outputSchema: {
        type: "object",
        properties: {
          answer: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Clear, descriptive title for the research report",
              },
              summary: {
                type: "string",
                description: "Executive summary in 4-6 sentences",
              },
              content: {
                type: "string",
                description:
                  "Comprehensive analysis in markdown format with source citations",
              },
              diagram: {
                type: "string",
                description:
                  "Mermaid diagram code if beneficial (empty string if not needed)",
              },
              key_insights: {
                type: "array",
                items: { type: "string" },
                description: "3-5 most important insights from the research",
              },
              confidence_level: {
                type: "number",
                description:
                  "Confidence score 1-10 based on source quality and coverage",
              },
              sources_used: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    type: { type: "string" },
                  },
                },
                description: "List of all sources referenced in the content",
              },
              images: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    description: { type: "string" },
                    context: { type: "string" },
                  },
                },
                description:
                  "List of relevant images extracted from search results",
              },
            },
          },
          totalTokens: { type: "number" },
        },
      },
      messages: [
        {
          role: "user",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Create a comprehensive research report based on all collected information.",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  Research Instruction: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "32c8abfa-f993-4c29-906a-d1c26f36711e",
                      label: `{"nodeId":"${INPUT}","path":["research_instruction"]}`,
                      mentionSuggestionChar: "@",
                    },
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "hardBreak" },
                  { type: "text", text: "  Topic Area: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "c20376fa-66ec-45ce-bbef-a4f8d793e110",
                      label: `{"nodeId":"${INPUT}","path":["topic"]}`,
                      mentionSuggestionChar: "@",
                    },
                  },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  Output Language: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "87a8619d-b077-48de-8351-1cb5bdf6cc59",
                      label: `{"nodeId":"${INPUT}","path":["language"]}`,
                      mentionSuggestionChar: "@",
                    },
                  },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "  Information Sources:" }],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  - Initial Search: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "53de2392-4c38-4d56-a8bf-d1b64892a348",
                      label: `{"nodeId":"${INITIAL_SEARCH}","path":["tool_result"]}`,
                      mentionSuggestionChar: "@",
                    },
                  },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  - Analysis: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "7447143a-9154-49e8-b3bb-bff946398903",
                      label: `{"nodeId":"${ANALYSIS}","path":["answer"]}`,
                      mentionSuggestionChar: "@",
                    },
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                  { type: "text", text: "  - Detailed Content: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "2769be0e-9631-4562-9ccc-2026d7aca616",
                      label: `{"nodeId":"${CONTENT_EXTRACTION}","path":["tool_result"]}`,
                      mentionSuggestionChar: "@",
                    },
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  - Additional Search: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "9ebfa7ad-341d-4db5-a88b-1d772fa97edd",
                      label: `{"nodeId":"${ADDITIONAL_SEARCH}","path":["tool_result"]}`,
                      mentionSuggestionChar: "@",
                    },
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Generate a structured report that directly addresses the research instruction:",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  1. " },
                  { type: "text", marks: [{ type: "bold" }], text: "title" },
                  { type: "text", text: " (string):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Clear, descriptive title that reflects the research focus",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Should align with the research instruction objectives",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  2. " },
                  { type: "text", marks: [{ type: "bold" }], text: "summary" },
                  { type: "text", text: " (string):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Executive summary in 4-6 sentences",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Directly answer the key questions in the research instruction",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Highlight major findings and implications",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  3. " },
                  { type: "text", marks: [{ type: "bold" }], text: "content" },
                  { type: "text", text: " (string - markdown format):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Comprehensive analysis organized logically",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Structure based on the research instruction requirements",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Include: key findings, evidence, analysis, implications, recommendations",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Use proper markdown formatting with headers, lists, emphasis",
                  },
                ],
              },
              { type: "paragraph", content: [{ type: "text", text: "     " }] },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "Important Content Guidelines:",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     - " },
                  { type: "text", marks: [{ type: "bold" }], text: "Images" },
                  {
                    type: "text",
                    text: ": If images are available in the search results, include relevant ones using markdown image syntax: `![Image description](image_url)`",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     - " },
                  { type: "text", marks: [{ type: "bold" }], text: "Sources" },
                  {
                    type: "text",
                    text: ": Always cite sources when referencing specific information using format: `[Source Title](URL)` or `According to [Source Title](URL), ...`",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     - " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "Data and Statistics",
                  },
                  {
                    type: "text",
                    text: ": When presenting data, always include the source",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     - " },
                  { type: "text", marks: [{ type: "bold" }], text: "Quotes" },
                  {
                    type: "text",
                    text: ": Use blockquotes for important quotes with attribution",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     - " },
                  { type: "text", marks: [{ type: "bold" }], text: "Evidence" },
                  {
                    type: "text",
                    text: ": Support claims with specific evidence from the sources",
                  },
                ],
              },
              { type: "paragraph", content: [{ type: "text", text: "     " }] },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "Structure Example:",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "     ```markdown" }],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "     ## Introduction" }],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     Brief overview with context" },
                ],
              },
              { type: "paragraph", content: [{ type: "text", text: "     " }] },
              {
                type: "paragraph",
                content: [{ type: "text", text: "     ## Key Findings" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Finding 1 with source citation",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Finding 2 with source citation",
                  },
                ],
              },
              { type: "paragraph", content: [{ type: "text", text: "     " }] },
              {
                type: "paragraph",
                content: [{ type: "text", text: "     ## Visual Evidence" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     ![Chart showing trend](image_url)",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "     " },
                  {
                    type: "text",
                    marks: [{ type: "italic" }],
                    text: "Source: [Report Title](URL)",
                  },
                ],
              },
              { type: "paragraph", content: [{ type: "text", text: "     " }] },
              {
                type: "paragraph",
                content: [{ type: "text", text: "     ## Detailed Analysis" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     In-depth analysis with multiple source citations",
                  },
                ],
              },
              { type: "paragraph", content: [{ type: "text", text: "     " }] },
              {
                type: "paragraph",
                content: [{ type: "text", text: "     ## Implications" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     What this means for the research question",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "     ```" }],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  4. " },
                  { type: "text", marks: [{ type: "bold" }], text: "diagram" },
                  { type: "text", text: " (string - Mermaid code):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Create visualization if it helps explain findings",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Examples: process flows, relationships, timelines, comparisons",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Only include if it adds significant value",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  5. " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "key_insights",
                  },
                  { type: "text", text: " (array of strings):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - 3-5 most important insights from the research",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Should directly relate to the research instruction objectives",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  6. " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "confidence_level",
                  },
                  { type: "text", text: " (number 1-10):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Rate confidence in findings based on source quality and coverage",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  7. " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "sources_used",
                  },
                  { type: "text", text: " (array of objects):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - List all sources referenced in the content",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: '     - Format: {"title": "Source Title", "url": "URL", "type": "article/report/study"}',
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "  Write in [INITIAL_SEARCH.output_language]. Ensure the report:",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "  - Fully addresses the research instruction",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "  - Includes relevant images where they add value",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  - Properly cites all sources" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  - Provides actionable insights" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "  - Maintains professional formatting",
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                  { type: "text", text: "8. " },
                  { type: "text", marks: [{ type: "bold" }], text: "images" },
                  { type: "text", text: " (array of objects):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "   - " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "Extract at least 3 relevant images",
                  },
                  { type: "text", text: " from the search results" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: '   - Format: {"url": "image_url", "description": "descriptive caption", "context": "how this image relates to the research"}',
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Select images that support key findings or illustrate important concepts",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Include diverse image types: charts, diagrams, photos, infographics",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Prioritize images that enhance understanding of the research topic",
                  },
                ],
              },
            ],
          },
        },
      ],
      model: { provider: "anthropic", model: "claude-4-sonnet" },
    },
  },
  {
    id: SEARCH_CONDITION,

    kind: "condition",
    name: "SEARCH_CONDITION",
    description: "",
    uiConfig: {
      position: { x: 1096.3175798437799, y: 108.80530614989887 },
      type: "default",
    },
    nodeConfig: {
      kind: "condition",
      outputSchema: { type: "object", properties: {} },
      branches: {
        if: {
          id: "if",
          logicalOperator: "AND",
          type: "if",
          conditions: [
            {
              source: {
                nodeId: ANALYSIS,
                path: ["answer", "additional_search_instruction"],
                nodeName: "ANALYSIS",
                type: "object",
              },
              operator: "is_empty",
            },
          ],
        },
        else: {
          id: "else",
          logicalOperator: "AND",
          type: "else",
          conditions: [],
        },
      },
    },
  },
  {
    id: ADDITIONAL_SEARCH,

    kind: "tool",
    name: "ADDITIONAL_SEARCH",
    description: "Perform supplementary search based on specific instruction",
    uiConfig: {
      position: { x: 1439.3610744098883, y: 257.6457427362809 },
      type: "default",
    },
    nodeConfig: {
      kind: "tool",
      outputSchema: {
        type: "object",
        properties: { tool_result: { type: "object" } },
      },
      model: { provider: "openai", model: "4o" },
      message: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Perform targeted search based on this specific instruction: ",
              },
              {
                type: "mention",
                attrs: {
                  id: "dc2caf22-632d-4388-bf9c-7c8626a24c65",
                  label: `{"nodeId":"${ANALYSIS}","path":["answer","additional_search_instruction"]}`,
                },
              },
              { type: "hardBreak" },
              { type: "hardBreak" },
              { type: "hardBreak" },
              { type: "text", text: "Research Context: " },
              {
                type: "mention",
                attrs: {
                  id: "6ab2e17b-1e04-4065-97d4-627de934b88d",
                  label: `{"nodeId":"${INPUT}","path":["research_instruction"]}`,
                },
              },
              { type: "hardBreak" },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "  Topic Area: " },
              {
                type: "mention",
                attrs: {
                  id: "c8de8dcf-0218-4b31-8552-b1f5d0ab8ad3",
                  label: `{"nodeId":"${INPUT}","path":["topic"]}`,
                },
              },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "  Search Strategy:" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  1. Follow the specific search instruction precisely",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  2. Focus on filling the identified information gaps",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  3. Look for recent developments and expert perspectives",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  4. Include diverse viewpoints and comprehensive coverage",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  5. Prioritize sources that add new insights to the research",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  Target 8-10 high-quality results that provide unique value.",
              },
            ],
          },
        ],
      },
      tool: {
        type: "app-tool",
        id: "webSearch",
        description:
          "A web search tool for quick research and information gathering. Provides basic search results with titles, summaries, and URLs from across the web. Perfect for finding relevant sources and getting an overview of topics.",
        parameterSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            search_depth: {
              type: "string",
              enum: ["basic", "advanced"],
              description:
                "The depth of the search. It can be 'basic' or 'advanced'",
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
              description:
                "Include a list of query-related images in the response",
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
        },
      },
    },
  },
  {
    id: OUTPUT,

    kind: "output",
    name: "OUTPUT",
    description: "",
    uiConfig: {
      position: { x: 2632.4044439691656, y: 29.67494745840466 },
      type: "default",
    },
    nodeConfig: {
      kind: "output",
      outputSchema: { type: "object", properties: {} },
      outputData: [
        {
          key: "research_findings",
          source: {
            nodeId: SUMMARY,
            path: ["answer"],
          },
        },
        {
          key: "organized_data",
          source: {
            nodeId: ORGANIZATION,
            path: ["answer"],
          },
        },
        {
          key: "message_response_guide",
          source: {
            nodeId: REPORT_GUIDE,
            path: ["template"],
          },
        },
        {
          key: "images",
          source: {
            nodeId: SUMMARY,
            path: ["answer", "images"],
          },
        },
      ],
    },
  },
  {
    id: ORGANIZATION,

    kind: "llm",
    name: "ORGANIZATION",
    description:
      "Organize and summarize all collected information for report generation",
    uiConfig: {
      position: { x: 2272.4044439691656, y: 91.44758151102624 },
      type: "default",
    },
    nodeConfig: {
      kind: "llm",
      outputSchema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          totalTokens: { type: "number" },
        },
      },
      messages: [
        {
          role: "system",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "You are a research information organizer. Your task is to systematically organize and summarize all collected research information into a comprehensive, well-structured format that will be used for report generation.",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Your response should include:" },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "## RESEARCH OVERVIEW" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "[Summarize the research instruction and approach]",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "## KEY SOURCES IDENTIFIED" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "[List all important sources with titles and URLs]",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "- [Source Title 1](URL1) - Brief description",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "- [Source Title 2](URL2) - Brief description",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "- [Source Title 3](URL3) - Brief description",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "## AVAILABLE IMAGES" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "[List all images found with descriptions and URLs]",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "- ![Description 1](image_url1) - Context/relevance",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "- ![Description 2](image_url2) - Context/relevance",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "- ![Description 3](image_url3) - Context/relevance",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "## MAIN FINDINGS" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "[Organized key findings with source attributions]",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "- Finding 1 (Source: [Title](URL))" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "- Finding 2 (Source: [Title](URL))" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "- Finding 3 (Source: [Title](URL))" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "## DETAILED CONTENT SUMMARY" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "[Comprehensive summary of all extracted content]",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "## STATISTICAL DATA" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "[Any numbers, statistics, or quantitative data found]",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "## EXPERT OPINIONS/QUOTES" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "[Important quotes or expert perspectives]",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "## RESEARCH GAPS" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "[Areas where information might be incomplete]",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Make this comprehensive and well-organized for easy reference in report generation.",
                  },
                ],
              },
            ],
          },
        },
        {
          role: "user",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Research Instruction: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "4a3380c5-0b39-43a8-906e-f0a38ca41539",
                      label: `{"nodeId":"${INPUT}","path":["research_instruction"]}`,
                    },
                  },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Topic Area: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "1de3a234-9029-4914-8086-ba9789e2a017",
                      label: `{"nodeId":"${INPUT}","path":["topic"]}`,
                    },
                  },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Initial Search Results: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "2ea9f224-5806-408a-a538-c61313a6f0af",
                      label: `{"nodeId":"${INITIAL_SEARCH}","path":["tool_result"]}`,
                    },
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Analysis Summary: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "a0c436b7-6300-4d1f-a0e6-1316c1c8cdc7",
                      label: `{"nodeId":"${ANALYSIS}","path":["answer"]}`,
                    },
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Detailed Content: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "10bf3fbf-2421-4d94-bc64-30e96ef28168",
                      label: `{"nodeId":"${CONTENT_EXTRACTION}","path":["tool_result"]}`,
                    },
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Additional Search:  " },
                  {
                    type: "mention",
                    attrs: {
                      id: "2e50dd84-1d6a-4680-92ae-b3d78045b713",
                      label: `{"nodeId":"${ADDITIONAL_SEARCH}","path":["tool_result"]}`,
                    },
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Please organize all this information according to the format specified in the system prompt.",
                  },
                ],
              },
            ],
          },
        },
      ],
      model: { provider: "openai", model: "4o" },
    },
  },
  {
    id: REPORT_GUIDE,

    kind: "template",
    name: "REPORT_GUIDE",
    description: "",
    uiConfig: {
      position: { x: 2270.033917728336, y: -27.217682321506935 },
      type: "default",
    },
    nodeConfig: {
      kind: "template",
      outputSchema: {
        type: "object",
        properties: { template: { type: "string" } },
      },
      template: {
        type: "tiptap",
        tiptap: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Create a comprehensive research report using the research findings. Guidelines:",
                },
              ],
            },
            { type: "paragraph", content: [{ type: "hardBreak" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Present the complete content directly without code blocks or formatting wrapper",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: '- Do not add introductory remarks like "Here\'s the report" or "Report completed"',
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Use the title, summary, and complete content from findings",
                },
              ],
            },
            { type: "paragraph", content: [{ type: "hardBreak" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "MANDATORY REQUIREMENTS:",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "- " },
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "MUST include at least 3 relevant images",
                },
                {
                  type: "text",
                  text: " using ![Description](image_url) format throughout the content",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "- " },
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "MUST include the mermaid diagram",
                },
                {
                  type: "text",
                  text: " from research_findings using \\`\\`\\`mermaid format within the content flow",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "- " },
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "MUST cite every source with URLs",
                },
                { type: "text", text: " - format: [Source Title](URL)" },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "- " },
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "MUST include source URLs",
                },
                {
                  type: "text",
                  text: " for all data, statistics, and factual information",
                },
              ],
            },
            { type: "paragraph", content: [{ type: "hardBreak" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "IMAGE USAGE:",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Extract images from organized_data or research_findings content",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Place images strategically to support key points",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Use format: ![Descriptive caption](image_url)",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Include image source attribution when possible",
                },
              ],
            },
            { type: "paragraph", content: [{ type: "hardBreak" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "MERMAID DIAGRAM:",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Use the diagram from research_findings.diagram",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Format: \\`\\`\\`mermaid [diagram_code] \\`\\`\\`",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Place within relevant content section, not as separate section",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Ensure diagram enhances understanding of the topic",
                },
              ],
            },
            { type: "paragraph", content: [{ type: "hardBreak" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "CONTENT STRUCTURE:",
                },
              ],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "# [research_findings.title]" }],
            },
            { type: "paragraph", content: [{ type: "hardBreak" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "[Include executive summary, key insights, detailed analysis with images and diagrams integrated naturally]",
                },
              ],
            },
            { type: "paragraph", content: [{ type: "hardBreak" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Confidence Level:",
                },
                {
                  type: "text",
                  text: " [research_findings.confidence_level]/10",
                },
              ],
            },
            { type: "paragraph", content: [{ type: "hardBreak" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Include confidence level and key insights naturally within the content",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Ensure all sources are properly cited throughout",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "- Present as a professional research report ready for the user",
                },
              ],
            },
          ],
        },
      },
    },
  },
  {
    id: ANALYSIS,

    kind: "llm",
    name: "ANALYSIS",
    description: "Analyze search results and determine research strategy",
    uiConfig: { position: { x: 720, y: 0 }, type: "default" },
    nodeConfig: {
      kind: "llm",
      outputSchema: {
        type: "object",
        properties: {
          answer: {
            type: "object",
            properties: {
              reference_sources: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string", description: "Source URL" },
                    summary: {
                      type: "string",
                      description:
                        "Brief summary of the source content and relevance",
                    },
                  },
                },
                description:
                  "List of key reference sources from search results",
              },
              important_url: {
                type: "string",
                description:
                  "Single most important URL for detailed content extraction",
              },
              additional_search_instruction: {
                type: "string",
                description:
                  "Specific instruction for additional search to fill information gaps (empty string if none needed)",
              },
              analysis_summary: {
                type: "string",
                description:
                  "Assessment of current research state and strategy",
              },
              research_completeness: {
                type: "number",
                description:
                  "Score 1-10 rating how well initial search addresses research instruction",
              },
            },
          },
          totalTokens: { type: "number" },
        },
      },
      messages: [
        {
          role: "user",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Analyze the search results in the context of the research instruction and determine the next steps.",
                  },
                  { type: "hardBreak" },
                  { type: "text", text: "---" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Research Instruction: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "23b93374-40fe-4397-8375-3ee3eacee22a",
                      label: `{"nodeId":"${INPUT}","path":["research_instruction"]}`,
                    },
                  },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "---" },
                  { type: "hardBreak" },
                  { type: "text", text: "Topic Area: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "fa4b502f-3b13-4717-b4ae-675961527f20",
                      label: `{"nodeId":"${INPUT}","path":["topic"]}`,
                    },
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "hardBreak" },
                  { type: "text", text: "---" },
                  { type: "hardBreak" },
                  { type: "text", text: "Search Results: " },
                  {
                    type: "mention",
                    attrs: {
                      id: "88493890-21ba-476a-a7c0-b6dd70a1d480",
                      label: `{"nodeId":"${INITIAL_SEARCH}","path":["tool_result"]}`,
                    },
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                  { type: "text", text: "---" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "1. " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "important_url",
                  },
                  { type: "text", text: " (string):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "   - " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "YOU MUST SELECT AT LEAST ONE URL",
                  },
                  {
                    type: "text",
                    text: " unless search results are completely irrelevant",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Choose the URL with the most comprehensive, authoritative information",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Prioritize: research papers, detailed reports, expert analyses, case studies, official websites",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Even if quality is moderate, select the BEST available option for detailed extraction",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: '   - Only return empty string "" if absolutely no URLs provide any additional value',
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "   - " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "Default behavior: ALWAYS select the most valuable URL from available results",
                  },
                  { type: "hardBreak" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  2. " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "additional_search_instruction",
                  },
                  { type: "text", text: " (string):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Specific instruction for additional search to fill information gaps",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: '     - Should be a clear directive like "Find recent statistics on AI adoption in hospitals" or "Search for regulatory challenges in healthcare AI implementation"',
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Based on what's missing from initial search relative to research instruction",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: '     - Return empty string "" if initial search provides sufficient coverage',
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  3. " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "analysis_summary",
                  },
                  { type: "text", text: " (string):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Assessment of how well current results address the research instruction",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Identification of information gaps and missing perspectives",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Quality and credibility evaluation of found sources",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Strategy for completing the research objective",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "  4. " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "research_completeness",
                  },
                  { type: "text", text: " (number 1-10):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Rate how well the initial search addresses the research instruction",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "     - Consider coverage, depth, and relevance to stated objectives",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "  Be strategic and selective. Focus on what's truly needed to address the research instruction.",
                  },
                  { type: "hardBreak" },
                  { type: "hardBreak" },
                  { type: "text", text: "5. " },
                  {
                    type: "text",
                    marks: [{ type: "bold" }],
                    text: "reference_sources",
                  },
                  { type: "text", text: " (array of objects):" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Extract 5-8 key reference sources from the search results",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: '   - For each source provide: {"url": "full_url", "summary": "brief description of content and relevance to research"}',
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Include diverse source types: official reports, news articles, academic papers, expert analyses",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Focus on sources that directly support the research instruction",
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "   - Prioritize credible, authoritative sources",
                  },
                ],
              },
            ],
          },
        },
      ],
      model: { provider: "openai", model: "4o" },
    },
  },
  {
    id: INPUT,
    kind: "input",
    name: "INPUT",
    description: "",
    uiConfig: { position: { x: 0, y: 0 }, type: "default" },
    nodeConfig: {
      kind: "input",
      outputSchema: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "Subject area or domain (e.g., 'technology', 'healthcare', 'finance', 'education')",
          },
          language: {
            type: "string",
            description:
              "Preferred language for sources. eg. en (English), ko (Korean)",
          },
          research_instruction: {
            type: "string",
            default:
              "Comprehensive research instruction including what to research, why, and how to approach it. Example: 'Research the current state of AI in healthcare, focusing on diagnostic applications, regulatory challenges, and market adoption rates. I need this for a business proposal targeting hospital administrators.'",
          },
        },
        required: ["research_instruction"],
      },
    },
  },
];

export const babyResearchEdges: Partial<DBEdge>[] = [
  {
    source: CONTENT_EXTRACTION,
    target: SUMMARY,
    uiConfig: { sourceHandle: "right", targetHandle: "left" },
  },
  {
    source: ORGANIZATION,
    target: OUTPUT,
    uiConfig: { sourceHandle: "right", targetHandle: "left" },
  },
  {
    source: SUMMARY,
    target: REPORT_GUIDE,
    uiConfig: {},
  },
  {
    source: ANALYSIS,
    target: URL_CONDITION,
    uiConfig: {},
  },
  {
    source: INITIAL_SEARCH,
    target: ANALYSIS,
    uiConfig: {},
  },
  {
    source: SEARCH_CONDITION,
    target: SUMMARY,
    uiConfig: { sourceHandle: "if", targetHandle: "left" },
  },
  {
    source: URL_CONDITION,
    target: CONTENT_EXTRACTION,
    uiConfig: { sourceHandle: "if" },
  },
  {
    source: SEARCH_CONDITION,
    target: ADDITIONAL_SEARCH,
    uiConfig: { sourceHandle: "else", targetHandle: "left" },
  },
  {
    source: REPORT_GUIDE,
    target: OUTPUT,
    uiConfig: {},
  },
  {
    source: INPUT,
    target: INITIAL_SEARCH,
    uiConfig: {},
  },
  {
    source: ADDITIONAL_SEARCH,
    target: SUMMARY,
    uiConfig: {},
  },
  {
    source: URL_CONDITION,
    target: SUMMARY,
    uiConfig: { sourceHandle: "else", targetHandle: "left" },
  },
  {
    source: ANALYSIS,
    target: SEARCH_CONDITION,
    uiConfig: {},
  },
  {
    source: SUMMARY,
    target: ORGANIZATION,
    uiConfig: {},
  },
];
