import { DBEdge, DBNode } from "app-types/workflow";
import { generateUUID } from "lib/utils";

const INPUT_ID = generateUUID();
const OUTPUT_ID = generateUUID();
const NOTE_ID = generateUUID();
const HTTP_ID = generateUUID();
const LLM_ID = generateUUID();

export const getWeatherNodes: Partial<DBNode>[] = [
  {
    id: INPUT_ID,
    kind: "input",
    name: "INPUT",
    description: "Collect story requirements and preferences from user",
    uiConfig: {
      position: { x: 0, y: 0 },
      type: "default",
    },
    nodeConfig: {
      kind: "input",
      outputSchema: {
        type: "object",
        properties: {
          region: { type: "string" },
        },
        required: ["region"],
      },
    },
  },
  {
    id: HTTP_ID,
    kind: "http",
    name: "WEATHER API",
    description: "Get weather data from the API",
    uiConfig: {
      position: { x: 720, y: 0 },
      type: "default",
    },
    nodeConfig: {
      kind: "http",
      outputSchema: {
        type: "object",
        properties: {
          response: {
            type: "object",
            properties: {
              status: { type: "number" },
              statusText: { type: "string" },
              ok: { type: "boolean" },
              headers: { type: "object" },
              body: { type: "string" },
              duration: { type: "number" },
              size: { type: "number" },
            },
          },
        },
      },
      method: "GET",
      headers: [],
      query: [
        { key: "current", value: "temperature_2m" },
        { key: "hourly", value: "temperature_2m" },
        { key: "timezone", value: "auto" },
        { key: "daily", value: "sunrise,sunset" },
        {
          key: "latitude",
          value: { nodeId: LLM_ID, path: ["answer", "latitude"] },
        },
        {
          key: "longitude",
          value: { nodeId: LLM_ID, path: ["answer", "longitude"] },
        },
      ],
      timeout: 30000,
      url: "https://api.open-meteo.com/v1/forecast",
    },
  },
  {
    id: LLM_ID,
    kind: "llm",
    name: "LLM",
    description: "Get latitude and longitude from the LLM",
    uiConfig: {
      position: { x: 360, y: 0 },
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
              latitude: {
                type: "number",
                description: "Geographical latitude of the location",
              },
              longitude: {
                type: "number",
                description: "Geographical longitude of the location",
              },
            },
          },
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
                    text: "What are the latitude and longitude of ",
                  },
                  {
                    type: "mention",
                    attrs: {
                      id: "e8d2314a-f81b-41e3-91ff-f235486a62f3",
                      label: `{"nodeId":"${INPUT_ID}","path":["region"]}`,
                    },
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
    id: NOTE_ID,
    kind: "note",
    name: "NOTE",
    description: `# 🌦️ Regional Weather Lookup Workflow

This workflow retrieves weather information for a specified region by chaining together an LLM for geocoding and an HTTP request to a public weather API.

### ➡️ Execution Pipeline

1.  **Input Region**: A user provides a region name (e.g., "Seoul" or "Tokyo").
2.  **Find Coordinates (LLM)**: The LLM converts the text-based region name into geographical latitude and longitude coordinates.
3.  **Fetch Weather API (HTTP)**: The workflow uses these coordinates to call the Open-Meteo weather API and request the current forecast.
4.  **Return Weather Data (Output)**: The raw JSON response from the weather API is passed on as the final result of the workflow.

---

### 🔬 Node Output Examples

Here are examples of the output structure for the key nodes in this workflow.

#### 📍 **Find Coordinates (LLM) Output**
This node outputs the latitude and longitude in a structured object.

\`\`\`json
{
"answer": {
  "latitude": 37.5665,
  "longitude": 126.9780
}
}
\`\`\`

#### ☁️ **Fetch Weather API (HTTP) Output**
This node returns the full HTTP response. The actual weather data is located inside the \`body\` field as a JSON string.

\`\`\`json
{
"response": {
  "status": 200,
  "ok": true,
  "body": "{\"latitude\":37.56,\"longitude\":126.97,\"current\":{\"time\":\"2023-10-27T12:00\",\"temperature_2m\":15.4},\"daily\":{\"sunrise\":[\"2023-10-27T06:45\"],\"sunset\":[\"2023-10-27T17:40\"]}}",
  "duration": 150
}
}
\`\`\`
`,
    uiConfig: {
      position: {
        x: -569.8790292584229,
        y: -731.5434457770423,
      },
      type: "default",
    },
    nodeConfig: {
      kind: "note",
      outputSchema: { type: "object", properties: {} },
    },
  },
  {
    id: OUTPUT_ID,
    kind: "output",
    name: "OUTPUT",
    description: "Output the weather data",
    uiConfig: {
      position: { x: 1080, y: 0 },
      type: "default",
    },
    nodeConfig: {
      kind: "output",
      outputSchema: { type: "object", properties: {} },
      outputData: [
        {
          key: "result",
          source: { nodeId: HTTP_ID, path: ["response", "body"] },
        },
      ],
    },
  },
];

export const getWeatherEdges: Partial<DBEdge>[] = [
  {
    source: INPUT_ID,
    target: LLM_ID,
    uiConfig: {},
  },
  {
    source: LLM_ID,
    target: HTTP_ID,
    uiConfig: {},
  },
  {
    source: HTTP_ID,
    target: OUTPUT_ID,
    uiConfig: {},
  },
];
