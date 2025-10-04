import { test as setup, expect } from "@playwright/test";
import * as fs from "node:fs";
import { TEST_USERS } from "../constants/test-users";
import type { Page } from "@playwright/test";
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

export async function selectDefaultModel(page: Page) {
  const defaultModel = process.env.E2E_DEFAULT_MODEL;
  if (defaultModel) {
    await selectModel(page, defaultModel);
  }
}

async function signInViaUi(
  page: Page,
  { email, password }: { email: string; password: string },
) {
  await page.goto("/sign-in");

  // Sign in with the seeded editor user
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Wait for redirect after successful login
  await page.waitForURL(
    (url) => {
      const urlStr = url.toString();
      return !urlStr.includes("/sign-in") && !urlStr.includes("/sign-up");
    },
    { timeout: 10000 },
  );
}

setup.beforeAll(async () => {
  fs.mkdirSync("tests/.auth", { recursive: true });
});

// Login with already-seeded admin user and save auth state
setup("create admin auth state", async ({ page }) => {
  console.log("🔐 Creating admin auth state...");

  // Login as the pre-seeded admin user
  await signInViaUi(page, {
    email: TEST_USERS.admin.email,
    password: TEST_USERS.admin.password,
  });

  // Save admin auth state
  await page.context().storageState({ path: TEST_USERS.admin.authFile });
  expect(fs.existsSync(TEST_USERS.admin.authFile)).toBeTruthy();
});

// Login with already-seeded editor user and save auth state
setup("create editor auth state", async ({ page }) => {
  console.log("🔐 Creating editor auth state...");
  await signInViaUi(page, {
    email: TEST_USERS.editor.email,
    password: TEST_USERS.editor.password,
  });
  // await selectDefaultModel(page); // Skipping - model may not be available

  // Save editor user auth state
  await page.context().storageState({ path: TEST_USERS.editor.authFile });
  expect(fs.existsSync(TEST_USERS.editor.authFile)).toBeTruthy();
});

// Login with already-seeded editor user and save auth state
setup("create editor2 auth state", async ({ page }) => {
  console.log("🔐 Creating editor auth state...");
  await signInViaUi(page, {
    email: TEST_USERS.editor2.email,
    password: TEST_USERS.editor2.password,
  });
  // await selectDefaultModel(page); // Skipping - model may not be available

  // Save editor user auth state
  await page.context().storageState({ path: TEST_USERS.editor2.authFile });
  expect(fs.existsSync(TEST_USERS.editor2.authFile)).toBeTruthy();
});

// Login with already-seeded regular user and save auth state
setup("create regular user auth state", async ({ page }) => {
  console.log("🔐 Creating regular user auth state...");
  await signInViaUi(page, {
    email: TEST_USERS.regular.email,
    password: TEST_USERS.regular.password,
  });
  // await selectDefaultModel(page); // Skipping - model may not be available

  // Save regular user auth state
  await page.context().storageState({ path: TEST_USERS.regular.authFile });
  expect(fs.existsSync(TEST_USERS.regular.authFile)).toBeTruthy();
});
