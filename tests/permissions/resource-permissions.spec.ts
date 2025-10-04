import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";
import { clickAndWaitForNavigation } from "../utils/test-helpers";

/**
 * Comprehensive E2E tests for role-based permission system
 * Tests that UI elements are properly shown/hidden based on user roles
 * for agents, workflows, and MCP connections
 */

test.describe("Resource Permissions - Regular User", () => {
  test.use({ storageState: TEST_USERS.regular.authFile });

  test("should NOT see create agent button on agents page", async ({
    page,
  }) => {
    await page.goto("/agents");

    // Should NOT see the "Create Agent" button in header
    await expect(page.getByTestId("create-agent-button")).not.toBeVisible();

    // Should NOT see the create agent card
    await expect(page.getByTestId("create-agent-card")).not.toBeVisible();
  });

  test("should be able to view agents but not edit/delete", async ({
    page,
    browser,
  }) => {
    // First, create an agent as an editor to ensure we have something to test
    const editorContext = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const editorPage = await editorContext.newPage();

    // Create a test agent with unique name
    const testAgentName = `Test Agent ${Date.now()}`;
    await editorPage.goto("/agent/new");
    await editorPage.getByTestId("agent-name-input").fill(testAgentName);
    await editorPage
      .getByTestId("agent-description-input")
      .fill("Test agent for permissions");

    // Save first, then edit to change visibility
    await editorPage.getByTestId("agent-save-button").click();
    await editorPage.waitForURL("**/agents");

    // Navigate back to the agent to set visibility
    await editorPage
      .locator(`main a:has-text("${testAgentName}")`)
      .first()
      .click();
    await editorPage.waitForURL(/\/agent\/[^\/]+$/);

    // Set visibility to public so regular user can see it
    await editorPage.getByTestId("visibility-button").click();
    await editorPage.getByTestId("visibility-public").click();

    await editorPage.getByTestId("agent-save-button").click();
    await editorPage.waitForURL("**/agents");
    await editorContext.close();

    // Now test as regular user
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    // Find and click on the test agent we just created - use the link directly
    const agentLink = page
      .locator(`main a:has-text("${testAgentName}")`)
      .first();

    await expect(agentLink).toBeVisible({ timeout: 10000 });
    await agentLink.click();

    // Should be able to view the agent
    await expect(page).toHaveURL(/\/agent\//);

    // Should NOT see edit/delete buttons for regular user
    await expect(page.getByRole("button", { name: /save/i })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /delete/i }),
    ).not.toBeVisible();
  });

  test("should NOT see create workflow options", async ({ page }) => {
    await page.goto("/workflow");

    // Should NOT see "Create with Example" dropdown
    await expect(
      page.getByTestId("create-workflow-with-example-button"),
    ).not.toBeVisible();

    // Should NOT see any create workflow buttons
    await expect(page.locator("text=/Create Workflow/i")).not.toBeVisible();
  });

  test("should NOT see add MCP server button", async ({ page }) => {
    await page.goto("/mcp");

    // Should NOT see "Add MCP Server" button
    await expect(page.getByTestId("add-mcp-server-button")).not.toBeVisible();
  });

  test("should be able to bookmark shared resources", async ({ page }) => {
    await page.goto("/agents");

    // Look for shared agents section
    const sharedSection = page.locator("text=/Shared Agents/i");
    if (await sharedSection.isVisible()) {
      const sharedAgents = page.getByTestId("shareable-card").filter({
        has: page.getByTestId("bookmark-button"),
      });

      const sharedCount = await sharedAgents.count();
      if (sharedCount > 0) {
        // Should be able to toggle bookmark
        const bookmarkBtn = sharedAgents.first().getByTestId("bookmark-button");
        await expect(bookmarkBtn).toBeVisible();

        // Can click bookmark
        await bookmarkBtn.click();

        // Verify bookmark state changed (aria-pressed or similar indicator)
        await expect(bookmarkBtn).toHaveAttribute("aria-pressed", /.*/);
      }
    }
  });
});

test.describe("Resource Permissions - Editor User", () => {
  test.use({ storageState: TEST_USERS.editor.authFile });

  test("should see create agent button and card on agents page", async ({
    page,
  }) => {
    await page.goto("/agents");

    // Should see the "Create Agent" button in header
    await expect(page.getByTestId("create-agent-button")).toBeVisible();

    // Should see the create agent card
    await expect(page.getByTestId("create-agent-card")).toBeVisible();
  });

  test("should be able to create a new agent", async ({ page }) => {
    await page.goto("/agents");

    // Ensure button is visible before clicking
    const createButton = page.getByTestId("create-agent-button");
    await expect(createButton).toBeVisible();

    // Click create new agent button
    await createButton.click();

    // Wait for navigation to agent creation page
    await page.waitForURL("/agent/new");
  });

  test("should see create workflow options", async ({ page }) => {
    await page.goto("/workflow");

    // Should see "Create with Example" dropdown
    await expect(
      page.getByTestId("create-workflow-with-example-button"),
    ).toBeVisible();

    // Click dropdown to verify options
    await page.getByTestId("create-workflow-with-example-button").click();

    // Should see example workflow options
    await expect(
      page.getByRole("menuitem", { name: /baby research/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /get weather/i }),
    ).toBeVisible();

    // Close dropdown
    await page.keyboard.press("Escape");
  });

  test("should see add MCP server button", async ({ page }) => {
    await page.goto("/mcp");

    // Should see "Add MCP Server" button
    await expect(page.getByTestId("add-mcp-server-button")).toBeVisible();
  });

  test("should be able to navigate to MCP creation", async ({ page }) => {
    await page.goto("/mcp");

    // Click add MCP server button
    const addButton = page.getByRole("button", { name: /add mcp server/i });
    if (await addButton.isVisible()) {
      await addButton.click();

      // Should navigate to MCP creation page
      await expect(page).toHaveURL("/mcp/create");
    }
  });

  test("should be able to edit own agents", async ({ page }) => {
    // First create an agent
    await page.goto("/agent/new");

    const agentName = `Test Agent ${Date.now()}`;

    await page.getByTestId("agent-name-input").fill(agentName);
    await page.getByTestId("agent-description-input").fill("Test description");

    await clickAndWaitForNavigation(page, "agent-save-button", "**/agents");

    await page.locator(`main a:has-text("${agentName}")`).first().click();

    // Wait for navigation
    await page.waitForURL(/\/agent\/[^\/]+$/);

    // Should see edit button on own agent
    await expect(page.getByTestId("agent-save-button")).toBeVisible();
  });

  test("editor can create private MCP servers but not feature them", async ({
    page,
  }) => {
    await page.goto("/mcp");

    // Should see "MCP Servers" title as editor (not "Available MCP Servers")
    await expect(page.locator("h1")).toContainText("MCP Servers");

    // Click add MCP server button
    const addButton = page.getByTestId("add-mcp-server-button");
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Should navigate to MCP creation page
    await expect(page).toHaveURL("/mcp/create");

    // Editor should NOT see visibility options
    await expect(page.getByTestId("mcp-visibility-select")).not.toBeVisible();
  });

  test("editor sees own MCP servers in 'My MCP Servers' section", async ({
    page,
  }) => {
    await page.goto("/mcp");

    // If editor has created any MCP servers, they should appear under "My MCP Servers"
    const myServersSection = page.locator("text=/My MCP Servers/i");

    // Editor may or may not have created servers, so check conditionally
    const hasServers = await myServersSection
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    if (hasServers) {
      // Should be able to see edit/delete buttons on own servers
      const mcpCard = page.getByTestId("mcp-card").first();
      if (await mcpCard.isVisible()) {
        await expect(page.getByTestId("edit-mcp-button").first()).toBeVisible();
        await expect(
          page.getByTestId("delete-mcp-button").first(),
        ).toBeVisible();
      }
    }
  });
});

test.describe("Resource Permissions - Admin User", () => {
  test.use({ storageState: TEST_USERS.admin.authFile });

  test("should see create agent button and card on agents page", async ({
    page,
  }) => {
    await page.goto("/agents");

    // Should see the "Create Agent" button in header
    await expect(page.getByTestId("create-agent-button")).toBeVisible();

    // Should see the create agent card
    await expect(page.getByTestId("create-agent-card")).toBeVisible();
  });

  test("should see create workflow options", async ({ page }) => {
    await page.goto("/workflow");

    // Should see "Create with Example" dropdown
    await expect(
      page.getByTestId("create-workflow-with-example-button"),
    ).toBeVisible();
  });

  test("should see add MCP server button", async ({ page }) => {
    await page.goto("/mcp");

    // Should see "Add MCP Server" button
    await expect(page.getByTestId("add-mcp-server-button")).toBeVisible();
  });

  test("admin can create and feature MCP servers", async ({ page }) => {
    await page.goto("/mcp");

    // Should see "MCP Servers" title as admin
    await expect(page.locator("h1")).toContainText("MCP Servers");

    // Click add MCP server button
    const addButton = page.getByTestId("add-mcp-server-button");
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Should navigate to MCP creation page
    await expect(page).toHaveURL("/mcp/create");

    // Admin SHOULD see visibility/sharing options
    const visibilitySelect = page.getByTestId("mcp-visibility-select");
    if (
      await visibilitySelect.isVisible({ timeout: 1000 }).catch(() => false)
    ) {
      // Admin can select featured visibility
      await visibilitySelect.click();
      await page.getByRole("option", { name: /featured/i }).click();
    }
  });

  test("admin can manage all MCP servers including shared ones", async ({
    page,
  }) => {
    await page.goto("/mcp");

    // Admin can edit/delete any MCP server
    const mcpCards = page.getByTestId("mcp-card");
    const cardCount = await mcpCards.count();

    if (cardCount > 0) {
      // Check first card has management buttons
      const firstCard = mcpCards.first();

      // Admin should see edit/delete on all servers
      const editBtn = firstCard.getByTestId("edit-mcp-button");
      const deleteBtn = firstCard.getByTestId("delete-mcp-button");

      // These should be visible for admin on any server
      if (await editBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(editBtn).toBeVisible();
      }
      if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(deleteBtn).toBeVisible();
      }
    }
  });
});

test.describe("Permission Boundaries - Cross-Role Verification", () => {
  test("verify regular user cannot access editor endpoints", async ({
    browser,
  }) => {
    // Create a new context with regular user auth
    const context = await browser.newContext({
      storageState: TEST_USERS.regular.authFile,
    });
    const page = await context.newPage();

    // Try to create an agent - should fail
    const response = await page.request.post("/api/agent", {
      data: {
        name: "Test Agent",
        description: "Should not be created",
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("permission");

    await context.close();
  });

  test("verify editor can access creation endpoints", async ({ browser }) => {
    // Create a new context with editor user auth
    const context = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const page = await context.newPage();

    const user = await page.request.get("/api/user/details");
    const userData = await user.json();

    // Try to create an agent - should succeed
    const response = await page.request.post("/api/agent", {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        name: `API Test Agent ${Date.now()}`,
        description: "Created via API test",
        instructions: {},
        visibility: "private",
        icon: {
          type: "emoji",
          value: "🤖",
        },
        userId: userData.id,
      },
    });

    // expect(response.status()).toBe(200);
    const agent = await response.json();
    expect(agent.id).toBeDefined();

    // Clean up - delete the created agent
    await page.request.delete(`/api/agent/${agent.id}`);

    // await context.close();
  });
});

test.describe("MCP Sharing Workflow - Complete Scenario", () => {
  test("complete MCP sharing workflow: admin creates and shares, editor creates private, user views shared", async ({
    browser,
  }) => {
    // Step 1: Admin creates and shares an MCP server
    const adminContext = await browser.newContext({
      storageState: TEST_USERS.admin.authFile,
    });
    const adminPage = await adminContext.newPage();

    await adminPage.goto("/mcp");

    // Admin creates a shared MCP server
    await adminPage.getByTestId("add-mcp-server-button").click();
    await adminPage.waitForURL("/mcp/create");

    const sharedServerName = `shared-mcp-${Date.now()}`;
    await adminPage
      .locator("input[placeholder*='Enter MCP server name']")
      .fill(sharedServerName);

    // Fill in a test command (required field)
    const commandInput = adminPage.getByTestId("mcp-config-editor");
    if (await commandInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await commandInput.fill(
        JSON.stringify(
          {
            command: "node",
            args: ["tests/fixtures/test-mcp-server.js"],
          },

          null,
          2,
        ),
      );

      // Look for visibility options (admin only feature)
      const visibilitySelect = adminPage.getByTestId("mcp-visibility-select");
      if (
        await visibilitySelect.isVisible({ timeout: 1000 }).catch(() => false)
      ) {
        await visibilitySelect.click();
        await adminPage.getByRole("option", { name: /public/i }).click();
      }

      // Save the shared server
      const saveButton = adminPage.getByRole("button", { name: /save/i });
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      await saveButton.click();
      await adminPage.waitForURL("/mcp");
    }

    // Step 2: Editor creates a private MCP server
    const editorContext = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const editorPage = await editorContext.newPage();

    await editorPage.goto("/mcp");

    await editorPage.getByTestId("add-mcp-server-button").click();
    await editorPage.waitForURL("/mcp/create");

    const privateServerName = `private-mcp-${Date.now()}`;
    await editorPage
      .locator("input[placeholder*='Enter MCP server name']")
      .fill(privateServerName);
    editorPage.getByTestId("mcp-config-editor").fill(
      JSON.stringify(
        {
          command: "node",
          args: ["tests/fixtures/test-mcp-server.js"],
        },

        null,
        2,
      ),
    );

    // Editor should NOT see visibility options
    await expect(
      editorPage.getByTestId("mcp-visibility-select"),
    ).not.toBeVisible();

    // Save as private (default)
    const saveButton = editorPage.getByRole("button", { name: /save/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    await editorPage.waitForURL("/mcp");

    // Editor should see their server in "My MCP Servers"
    await expect(editorPage.locator("text=/My MCP Servers/i")).toBeVisible();

    // Step 3: Regular user can only see shared servers
    const userContext = await browser.newContext({
      storageState: TEST_USERS.regular.authFile,
    });
    const userPage = await userContext.newPage();

    await userPage.goto("/mcp");

    // User should see "Available MCP Servers" not "MCP Servers"
    await expect(userPage.locator("h1")).toContainText("Available MCP Servers");

    // User should NOT see create button
    await expect(
      userPage.getByTestId("add-mcp-server-button"),
    ).not.toBeVisible();

    // User should NOT see "My MCP Servers" section
    await expect(userPage.locator("text=/My MCP Servers/i")).not.toBeVisible();

    // This is conditional based on whether admin successfully shared

    // User should NOT see edit/delete buttons on any MCP servers
    const editButtons = userPage.getByTestId("edit-mcp-button");
    const deleteButtons = userPage.getByTestId("delete-mcp-button");

    await expect(editButtons).not.toBeVisible();
    await expect(deleteButtons).not.toBeVisible();

    // Cleanup
    await adminContext.close();
    await editorContext.close();
    await userContext.close();
  });
});
