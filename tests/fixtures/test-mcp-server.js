import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "custom-mcp-server",
  version: "0.0.1",
});

server.tool(
  "get_weather",
  "Get the current weather at a location.",
  {
    latitude: z.number(),
    longitude: z.number(),
  },
  async ({ latitude, longitude }) => {
    return {
      content: [
        {
          type: "text",
          text: `The current temperature in ${latitude}, ${longitude} is 20°C.`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();

await server.connect(transport);
