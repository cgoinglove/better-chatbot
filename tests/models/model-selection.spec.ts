import { test, expect } from "@playwright/test";

test.describe("Model Selection", () => {
  test.use({ storageState: "tests/.auth/admin.json" });

  test("should persist selected model", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify that a model is selected (either from setup or default)
    await expect(page.getByTestId("selected-model-name")).toBeVisible();

    // Get the current model name
    const modelName = await page
      .getByTestId("selected-model-name")
      .textContent();
    expect(modelName).toBeTruthy();

    // Refresh the page and verify the model persists
    await page.reload();
    await page.waitForLoadState("networkidle");

    const modelNameAfterRefresh = await page
      .getByTestId("selected-model-name")
      .textContent();
    expect(modelNameAfterRefresh).toBe(modelName);
  });

  test("should change model selection", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Get the current model
    const currentModel = await page
      .getByTestId("selected-model-name")
      .textContent();

    // Open model selector
    await page.getByTestId("model-selector-button").click();

    // Wait for popover to open
    await expect(page.getByTestId("model-selector-popover")).toBeVisible();

    // Find all model options and log them
    const modelOptions = page.locator('[data-testid^="model-option-"]');
    const optionCount = await modelOptions.count();

    // Should have multiple models available
    expect(optionCount).toBeGreaterThan(1);

    // Find the first model option that doesn't have the selected-model-check icon
    const selectedOption = page
      .locator(
        '[data-testid^="model-option-"]:not(:has([data-testid="selected-model-check"]))',
      )
      .first();

    // Should have at least one unselected option
    await expect(selectedOption).toBeVisible();

    // Click on the unselected option
    await selectedOption.click();

    // Wait a moment for the change to take effect
    await page.waitForTimeout(1000);

    // Wait for popover to close
    await expect(page.getByTestId("model-selector-popover")).not.toBeVisible();

    // Verify the model changed
    const newModel = await page
      .getByTestId("selected-model-name")
      .textContent();
    expect(newModel).not.toBe(currentModel);
    expect(newModel).toBeTruthy();
  });

  test("should use selected model in agent creation", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("agent-save-button")).toBeEnabled({
      timeout: 10000,
    });

    // Check if Generate With AI button is available (requires valid model)
    const generateButton = page.locator('button:has-text("Generate With AI")');
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // The selected model should be available
    const modelName = await page
      .getByTestId("selected-model-name")
      .textContent();
    expect(modelName).toBeTruthy();
  });
});
