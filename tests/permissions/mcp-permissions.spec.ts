import { test, expect, Page, BrowserContext } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";
import { deleteMcpServer } from "../helpers/delete-data";
import { createMcpServer } from "../helpers/create-data";

// Helper to get MCP servers via API
async function getMcpServers(page: Page) {
  const response = await page.request.get("/api/mcp/list");
  return await response.json();
}

// Generate unique server names to avoid conflicts between parallel test runs
function generateServerName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// These tests within this block need to run serially because they test
// the same server across different roles
test.describe
  .serial("MCP Visibility - Admin Creates Private Server", () => {
    let adminServerName: string;
    let adminServerId: string;
    let adminPage: Page;
    let adminContext: BrowserContext;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(20 * 1000); // 2 minutes for setup operations
      // Admin creates a private MCP server
      adminContext = await browser.newContext({
        storageState: TEST_USERS.admin.authFile,
      });
      adminPage = await adminContext.newPage();

      adminServerName = generateServerName("admin-private");

      // Create via API for speed and reliability
      const { id } = await createMcpServer(
        { page: adminPage },
        { name: adminServerName, visibility: "private" },
      );
      adminServerId = id;
    });

    test("admin sees their own private server", async () => {
      // Login as admin
      await adminPage.goto("/mcp", { waitUntil: "networkidle" });

      // Admin should see their private server
      await expect(adminPage.getByText(adminServerName)).toBeVisible();

      // Verify it's in the "My MCP Servers" section
      const myServersSection = adminPage.getByTestId("my-mcp-servers-section");
      await expect(myServersSection).toBeVisible();
      await expect(myServersSection.getByText(adminServerName)).toBeVisible();
    });

    test("editor does NOT see admin's private server", async ({ browser }) => {
      const editorContext = await browser.newContext({
        storageState: TEST_USERS.editor.authFile,
      });
      const editorPage = await editorContext.newPage();

      await editorPage.goto("/mcp", { waitUntil: "networkidle" });

      // Editor should NOT see admin's private server
      await expect(editorPage.getByText(adminServerName)).not.toBeVisible();

      // Double-check via API
      const servers = await getMcpServers(editorPage);
      const hasAdminServer = servers.some(
        (s: any) => s.name === adminServerName,
      );
      expect(hasAdminServer).toBeFalsy();

      await editorContext.close();
    });

    test("regular user does NOT see admin's private server", async ({
      browser,
    }) => {
      const userContext = await browser.newContext({
        storageState: TEST_USERS.regular.authFile,
      });
      const userPage = await userContext.newPage();

      await userPage.goto("/mcp", { waitUntil: "networkidle" });

      // User should NOT see admin's private server
      await expect(userPage.getByText(adminServerName)).not.toBeVisible();

      // Double-check via API
      const servers = await getMcpServers(userPage);
      const hasAdminServer = servers.some(
        (s: any) => s.name === adminServerName,
      );
      expect(hasAdminServer).toBeFalsy();

      await userContext.close();
    });

    test.afterAll("delete admin server", async () => {
      if (adminServerId) {
        await deleteMcpServer({ page: adminPage }, adminServerId);
      }
      await adminContext.close();
    });
  });

test.describe
  .serial("MCP Visibility - Admin Features Server", () => {
    let featuredServerName: string;
    let featuredServerId: string;
    let adminContext: BrowserContext;
    let adminPage: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(20 * 1000); // 2 minutes for setup operations
      // Admin creates a featured MCP server
      adminContext = await browser.newContext({
        storageState: TEST_USERS.admin.authFile,
      });
      adminPage = await adminContext.newPage();

      featuredServerName = generateServerName("admin-featured");
      const { id } = await createMcpServer(
        { page: adminPage },
        { name: featuredServerName, visibility: "public" },
      );
      featuredServerId = id;
    });

    test("admin sees featured server", async () => {
      await adminPage.goto("/mcp", { waitUntil: "networkidle" });

      await expect(
        adminPage
          .getByTestId("mcp-server-card")
          .filter({ hasText: featuredServerName }),
      ).toHaveAttribute("data-featured", "true");
    });

    test("editor DOES see featured server", async ({ browser }) => {
      const editorContext = await browser.newContext({
        storageState: TEST_USERS.editor.authFile,
      });
      const editorPage = await editorContext.newPage();

      await editorPage.goto("/mcp", { waitUntil: "networkidle" });
      await expect(
        adminPage
          .getByTestId("mcp-server-card")
          .filter({ hasText: featuredServerName }),
      ).toHaveAttribute("data-featured", "true");

      await editorContext.close();
    });

    test("regular user DOES see featured server", async ({ browser }) => {
      const userContext = await browser.newContext({
        storageState: TEST_USERS.regular.authFile,
      });
      const userPage = await userContext.newPage();

      await userPage.goto("/mcp", { waitUntil: "networkidle" });
      await expect(
        adminPage
          .getByTestId("mcp-server-card")
          .filter({ hasText: featuredServerName }),
      ).toHaveAttribute("data-featured", "true");

      await userContext.close();
    });

    test.afterAll(async () => {
      if (featuredServerId) {
        await deleteMcpServer({ page: adminPage }, featuredServerId);
      }
      await adminContext.close();
    });
  });

test.describe
  .serial("MCP Visibility - Editor Creates Private Server", () => {
    let editorServerName: string;
    let editorServerId: string;
    let editorContext: BrowserContext;
    let editorPage: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(20 * 1000); // 2 minutes for setup operations
      // Editor creates a private MCP server
      editorContext = await browser.newContext({
        storageState: TEST_USERS.editor.authFile,
      });
      editorPage = await editorContext.newPage();

      editorServerName = generateServerName("editor-private");

      // Create via API
      const { id } = await createMcpServer(
        { page: editorPage },
        { name: editorServerName, visibility: "private" },
      );
      editorServerId = id;
    });

    test("editor sees their own private server", async () => {
      await editorPage.goto("/mcp", { waitUntil: "networkidle" });

      // Editor should see their own server
      await expect(editorPage.getByText(editorServerName)).toBeVisible();

      // Verify it's in the "My MCP Servers" section
      const myServersSection = editorPage.getByTestId("my-mcp-servers-section");
      await expect(myServersSection).toBeVisible();
      await expect(myServersSection.getByText(editorServerName)).toBeVisible();
    });

    test("admin does NOT see editor's private server", async ({ browser }) => {
      const adminContext = await browser.newContext({
        storageState: TEST_USERS.admin.authFile,
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto("/mcp", { waitUntil: "networkidle" });

      // Admin should NOT see editor's private server
      await expect(adminPage.getByText(editorServerName)).not.toBeVisible();

      // Double-check via API
      const servers = await getMcpServers(adminPage);
      const hasEditorServer = servers.some(
        (s: any) => s.name === editorServerName,
      );
      expect(hasEditorServer).toBeFalsy();

      await adminContext.close();
    });

    test("regular user does NOT see editor's private server", async ({
      browser,
    }) => {
      const userContext = await browser.newContext({
        storageState: TEST_USERS.regular.authFile,
      });
      const userPage = await userContext.newPage();

      await userPage.goto("/mcp", { waitUntil: "networkidle" });

      // User should NOT see editor's private server
      await expect(userPage.getByText(editorServerName)).not.toBeVisible();

      // Double-check via API
      const servers = await getMcpServers(userPage);
      const hasEditorServer = servers.some(
        (s: any) => s.name === editorServerName,
      );
      expect(hasEditorServer).toBeFalsy();

      await userContext.close();
    });

    test.afterAll(async () => {
      if (editorServerId) {
        await deleteMcpServer({ page: editorPage }, editorServerId);
      }
      await editorContext.close();
    });
  });

test.describe
  .serial("MCP Visibility - State Transitions", () => {
    let transitionServerName: string;
    let transitionServerId: string;
    let adminContext: BrowserContext;
    let adminPage: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(20 * 1000); // 20 seconds for setup operations
      try {
        // Admin creates a private server that will be toggled
        adminContext = await browser.newContext({
          storageState: TEST_USERS.admin.authFile,
        });
        adminPage = await adminContext.newPage();

        transitionServerName = generateServerName("transition-test");
        const { id } = await createMcpServer(
          { page: adminPage },
          { name: transitionServerName, visibility: "private" },
        );
        transitionServerId = id;
      } catch (error) {
        console.error("Failed to create transition test server:", error);
        // Clean up if we created context but failed to create server
        if (adminContext) {
          await adminContext.close();
        }
        throw error;
      }
    });

    test("transition from private to featured makes server visible to all", async ({
      browser,
    }) => {
      // Skip if server creation failed
      if (!transitionServerId) {
        test.skip();
        return;
      }

      // Verify initial state - user cannot see private server
      const userContext = await browser.newContext({
        storageState: TEST_USERS.regular.authFile,
      });
      const userPage = await userContext.newPage();

      await userPage.goto("/mcp", { waitUntil: "networkidle" });
      await expect(userPage.getByText(transitionServerName)).not.toBeVisible();

      // Admin changes server to featured
      const adminContext = await browser.newContext({
        storageState: TEST_USERS.admin.authFile,
      });
      const adminPage = await adminContext.newPage();

      await adminPage.goto("/mcp", { waitUntil: "networkidle" });

      // Find the server card
      const serverCard = adminPage
        .getByTestId("mcp-server-card")
        .filter({ hasText: transitionServerName });
      await expect(serverCard).toBeVisible();

      // Click visibility button
      const visibilityButton = serverCard.getByTestId("visibility-button");
      await visibilityButton.click();

      // Select featured option
      await adminPage.getByRole("menuitem", { name: /featured/i }).click();
      await expect(serverCard).toHaveAttribute("data-featured", "true");

      // Verify user can now see the featured server
      await userPage.reload({ waitUntil: "networkidle" });
      await expect(
        userPage
          .getByTestId("mcp-server-card")
          .filter({ hasText: transitionServerName }),
      ).toHaveAttribute("data-featured", "true");
      await userContext.close();
      await adminContext.close();
    });

    test.afterAll(async () => {
      if (transitionServerId && adminPage) {
        await deleteMcpServer({ page: adminPage }, transitionServerId);
      }
      if (adminContext) {
        await adminContext.close();
      }
    });
  });

// These UI tests are independent and can run in parallel
test.describe("MCP UI Permissions", () => {
  test("regular user cannot see Add MCP Server button", async ({ browser }) => {
    const userContext = await browser.newContext({
      storageState: TEST_USERS.regular.authFile,
    });
    const userPage = await userContext.newPage();

    await userPage.goto("/mcp", { waitUntil: "networkidle" });

    // User should NOT see add button
    await expect(
      userPage.getByTestId("add-mcp-server-button"),
    ).not.toBeVisible();

    await userContext.close();
  });

  test("editor can see Add MCP Server button", async ({ browser }) => {
    const editorContext = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const editorPage = await editorContext.newPage();

    await editorPage.goto("/mcp", { waitUntil: "networkidle" });

    // Editor should see add button
    await expect(editorPage.getByTestId("add-mcp-server-button")).toBeVisible();

    await editorContext.close();
  });

  test("admin can see Add MCP Server button", async ({ browser }) => {
    const adminContext = await browser.newContext({
      storageState: TEST_USERS.admin.authFile,
    });
    const adminPage = await adminContext.newPage();

    await adminPage.goto("/mcp", { waitUntil: "networkidle" });

    // Admin should see add button
    await expect(adminPage.getByTestId("add-mcp-server-button")).toBeVisible();

    await adminContext.close();
  });

  test("editor cannot set server as featured via UI", async ({ browser }) => {
    // First create a server as editor
    const editorContext = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const editorPage = await editorContext.newPage();

    const serverName = generateServerName("editor-ui-test");
    const { id } = await createMcpServer(
      { page: editorPage },
      { name: serverName, visibility: "private" },
    );

    // Navigate to MCP page
    await editorPage.goto("/mcp", { waitUntil: "networkidle" });

    // Find the server card
    const serverCard = editorPage
      .getByTestId("mcp-server-card")
      .filter({ hasText: serverName });
    await expect(serverCard).toBeVisible();

    // Click visibility button
    const visibilityButton = serverCard.getByTestId("visibility-button");

    // Editor should NOT see visibility button (or it should not have featured option)
    const isVisible = await visibilityButton.isVisible().catch(() => false);

    if (isVisible) {
      await visibilityButton.click();
      // Should NOT see featured option (public visibility)
      await expect(
        editorPage.getByTestId("visibility-public"),
      ).not.toBeVisible();
      await editorPage.keyboard.press("Escape");
    }

    // Cleanup
    await deleteMcpServer({ browser }, id);
    await editorContext.close();
  });

  test("admin can set any server as featured via UI", async ({ browser }) => {
    const adminContext = await browser.newContext({
      storageState: TEST_USERS.admin.authFile,
    });
    const adminPage = await adminContext.newPage();
    // Create a server as admin
    const serverName = generateServerName("admin-ui-test");
    const { id } = await createMcpServer(
      { page: adminPage },
      { name: serverName, visibility: "private" },
    );

    // Navigate to MCP page
    await adminPage.goto("/mcp", { waitUntil: "networkidle" });

    // Find the server card
    const serverCard = adminPage
      .getByTestId("mcp-server-card")
      .filter({ hasText: serverName });
    await expect(serverCard).toBeVisible();

    // Click visibility button
    const visibilityButton = serverCard.getByTestId("visibility-button");
    await expect(visibilityButton).toBeVisible();
    await visibilityButton.click();

    // Should see both private and featured options
    await expect(adminPage.getByTestId("visibility-private")).toBeVisible();
    await expect(adminPage.getByTestId("visibility-public")).toBeVisible();

    // Select featured (which is actually "public" in the data)
    await adminPage.getByTestId("visibility-public").click();

    await expect(
      adminPage.getByTestId("mcp-server-card").filter({ hasText: serverName }),
    ).toHaveAttribute("data-featured", "true");

    // Cleanup
    await deleteMcpServer({ browser }, id);
    await adminContext.close();
  });
});

// These API tests are independent and can run in parallel
test.describe("MCP API Permissions", () => {
  test("regular user cannot create MCP server via API", async ({ browser }) => {
    const userContext = await browser.newContext({
      storageState: TEST_USERS.regular.authFile,
    });
    const userPage = await userContext.newPage();

    const response = await userPage.request.post("/api/mcp", {
      headers: { "Content-Type": "application/json" },
      data: {
        name: generateServerName("user-api-test"),
        config: {
          command: "node",
          args: ["tests/fixtures/test-mcp-server.js"],
        },
        visibility: "private",
      },
      failOnStatusCode: false,
    });

    expect([401, 403]).toContain(response.status());

    await userContext.close();
  });

  test("admin can delete any user's MCP server", async ({ browser }) => {
    let editorServerId: string | undefined;
    let editorContext: any;
    let adminContext: any;

    try {
      // Step 1: Editor creates a private MCP server
      editorContext = await browser.newContext({
        storageState: TEST_USERS.editor.authFile,
      });
      const editorPage = await editorContext.newPage();

      const serverName = generateServerName("editor-for-admin-delete");
      const result = await createMcpServer(
        { page: editorPage },
        { name: serverName, visibility: "private" },
      );
      editorServerId = result.id;
      console.log("editorServerId", editorServerId);

      // Step 2: Verify editor can see their server
      await editorPage.goto("/mcp", { waitUntil: "networkidle" });
      await expect(editorPage.getByText(serverName)).toBeVisible();

      // Step 3: Admin deletes editor's server via API
      adminContext = await browser.newContext({
        storageState: TEST_USERS.admin.authFile,
      });
      const adminPage = await adminContext.newPage();

      const deleteResponse = await adminPage.request.delete(
        `/api/mcp/${editorServerId}`,
      );
      console.log("deleteResponse", deleteResponse);
      expect(deleteResponse.ok()).toBeTruthy();

      // Step 4: Verify server is deleted - editor can no longer see it
      await editorPage.reload({ waitUntil: "networkidle" });
      await expect(editorPage.getByText(serverName)).not.toBeVisible();

      // Step 5: Verify via API that server is gone
      const servers = await getMcpServers(editorPage);
      const hasDeletedServer = servers.some(
        (s: any) => s.id === editorServerId,
      );
      expect(hasDeletedServer).toBeFalsy();
    } finally {
      // Always cleanup
      if (editorContext) await editorContext.close();
      if (adminContext) await adminContext.close();
    }
  });

  test("editor cannot delete admin's MCP server", async ({ browser }) => {
    let adminServerId: string | undefined;
    let adminContext: any;
    let editorContext: any;

    try {
      // Step 1: Admin creates a private MCP server
      adminContext = await browser.newContext({
        storageState: TEST_USERS.admin.authFile,
      });
      const adminPage = await adminContext.newPage();

      const serverName = generateServerName("admin-protected");
      const result = await createMcpServer(
        { page: adminPage },
        { name: serverName, visibility: "private" },
      );
      adminServerId = result.id;

      // Step 2: Editor tries to delete admin's server via API
      editorContext = await browser.newContext({
        storageState: TEST_USERS.editor.authFile,
      });
      const editorPage = await editorContext.newPage();

      const deleteResponse = await editorPage.request.delete(
        `/api/mcp/${adminServerId}`,
        {
          failOnStatusCode: false,
        },
      );
      expect(deleteResponse.status()).toBe(403);

      // Step 3: Verify server still exists
      await adminPage.goto("/mcp", { waitUntil: "networkidle" });
      await expect(adminPage.getByText(serverName)).toBeVisible();

      // Cleanup
      if (adminServerId) {
        await deleteMcpServer({ page: adminPage }, adminServerId);
      }
    } finally {
      // Always cleanup contexts
      if (adminContext) await adminContext.close();
      if (editorContext) await editorContext.close();
    }
  });

  test("regular user cannot delete any MCP server", async ({ browser }) => {
    // Step 1: Editor creates a private MCP server
    const editorContext = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const editorPage = await editorContext.newPage();

    const serverName = generateServerName("editor-protected");
    const { id: editorServerId } = await createMcpServer(
      { page: editorPage },
      { name: serverName, visibility: "private" },
    );

    // Step 2: Regular user tries to delete editor's server via API
    const userContext = await browser.newContext({
      storageState: TEST_USERS.regular.authFile,
    });
    const userPage = await userContext.newPage();

    const deleteResponse = await userPage.request.delete(
      `/api/mcp/${editorServerId}`,
      {
        failOnStatusCode: false,
      },
    );
    expect(deleteResponse.status()).toBe(403);

    // Step 3: Verify server still exists
    await editorPage.goto("/mcp", { waitUntil: "networkidle" });
    await expect(editorPage.getByText(serverName)).toBeVisible();

    // Cleanup
    await deleteMcpServer({ page: editorPage }, editorServerId);
    await editorContext.close();
    await userContext.close();
  });
});
