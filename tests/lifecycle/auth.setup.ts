import { test as setup, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import * as fs from "node:fs";

function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function selectModel(
  page: Page,
  providerModel: string,
): Promise<void> {
  const [provider, modelName] = providerModel.split("/");

  if (!provider || !modelName) {
    throw new Error(
      `Invalid model format: ${providerModel}. Expected format: provider/modelName`,
    );
  }

  // Open model selector
  await page.getByTestId("model-selector-button").click();

  // Wait for popover to open
  await expect(page.getByTestId("model-selector-popover")).toBeVisible();

  // Find the specific model option
  const modelOption = page.getByTestId(`model-option-${provider}-${modelName}`);

  // Check if the model exists
  await expect(modelOption).toBeVisible();

  // Click on the model option
  await modelOption.click();

  // Wait for popover to close
  await expect(page.getByTestId("model-selector-popover")).not.toBeVisible();

  // Verify the model was selected
  const selectedModel = await page
    .getByTestId("selected-model-name")
    .textContent();
  expect(selectedModel).toBe(modelName);
}

async function registerViaUi(
  page: Page,
  { email, name, password }: { email: string; name: string; password: string },
) {
  await page.goto("/sign-up");

  // Step 1: Email
  await page.locator("#email").fill(email);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: Name
  await page.locator("#name").fill(name);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: Password
  await page.locator("#password").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();

  // Wait for redirect to home (or any authenticated page)
  // Try multiple possible URLs that might indicate successful registration
  await page.waitForURL(
    (url) => {
      const urlStr = url.toString();
      return (
        !urlStr.includes("/sign-in") &&
        !urlStr.includes("/sign-up") &&
        !urlStr.includes("/auth")
      );
    },
    { timeout: 10000 },
  );
  await page.waitForLoadState("networkidle");

  // Verify we're on the authenticated page by checking we're not on sign-in
  const url = page.url();
  expect(url).not.toContain("/sign-in");
  expect(url).not.toContain("/sign-up");
}

setup.beforeAll(async () => {
  fs.mkdirSync("tests/.auth", { recursive: true });
});

// Register and save storage for user 1
setup("register user 1 and save storage", async ({ page, context }) => {
  const suffix = uniqueSuffix();
  const email = `playwright.user1.${suffix}@example.com`;
  const name = `Test User 1 ${suffix}`;
  const password = "TestPassword123!";

  await registerViaUi(page, { email, name, password });

  // Set default model if E2E_DEFAULT_MODEL is specified
  const defaultModel = process.env.E2E_DEFAULT_MODEL;
  if (defaultModel) {
    console.log(`Setting default model: ${defaultModel}`);
    try {
      await selectModel(page, defaultModel);
    } catch (error) {
      console.warn(`Failed to set default model ${defaultModel}:`, error);
      // Don't fail the setup if model selection fails
    }
  }

  await context.storageState({ path: "tests/.auth/user1.json" });
  // Ensure file exists
  expect(fs.existsSync("tests/.auth/user1.json")).toBeTruthy();
});

// Register and save storage for user 2 in a fresh context
setup("register user 2 and save storage", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const suffix = uniqueSuffix();
  const email = `playwright.user2.${suffix}@example.com`;
  const name = `Test User 2 ${suffix}`;
  const password = "TestPassword123!";

  await registerViaUi(page, { email, name, password });

  // Set default model if E2E_DEFAULT_MODEL is specified
  const defaultModel = process.env.E2E_DEFAULT_MODEL;
  if (defaultModel) {
    console.log(`Setting default model for user 2: ${defaultModel}`);
    try {
      await selectModel(page, defaultModel);
    } catch (error) {
      console.warn(
        `Failed to set default model ${defaultModel} for user 2:`,
        error,
      );
      // Don't fail the setup if model selection fails
    }
  }

  await context.storageState({ path: "tests/.auth/user2.json" });
  expect(fs.existsSync("tests/.auth/user2.json")).toBeTruthy();

  await context.close();
});
