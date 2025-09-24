import { Browser, BrowserContext, Page } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

export const createMcpServer = async (
  access: {
    browser?: Browser;
    context?: BrowserContext;
    page?: Page;
  },
  server: {
    name: string;
    config?: {
      command?: string;
      args?: string[];
      [key: string]: any;
    };
    visibility?: "public" | "private";
  },
) => {
  try {
    let page: Page;
    if (!access.browser && !access.page && !access.context) {
      throw new Error("Browser, context, or page is required");
    }
    if (access.page) {
      page = access.page;
    }
    if (access.context) {
      page = await access.context.newPage();
    }
    if (access.browser) {
      const browserContext = await access.browser.newContext({
        storageState: TEST_USERS.admin.authFile,
      });
      page = await browserContext.newPage();
    }
    const response = await page!.request.post("/api/mcp", {
      headers: { "Content-Type": "application/json" },
      data: {
        name: server.name,
        config: server.config ?? {
          command: "node",
          args: ["tests/fixtures/test-mcp-server.js"],
        },
        visibility: server.visibility ?? "private",
      },
      timeout: 15000,
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to create MCP server: Status ${response.status()} - ${errorBody}`,
      );
    }
    const serverInfo = (await response.json()) as { id: string };
    if (!serverInfo.id) {
      throw new Error("Failed to create MCP server");
    }
    return serverInfo;
  } catch (error) {
    console.error("Error creating MCP server", error);
    throw error;
  }
};
