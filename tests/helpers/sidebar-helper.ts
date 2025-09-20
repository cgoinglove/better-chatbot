import { Page } from "@playwright/test";

/**
 * Ensures the sidebar is open in the application
 * Handles both desktop and mobile viewports
 */
export async function ensureSidebarOpen(page: Page) {
  // Check the sidebar toggle button's data-state
  const desktopToggle = page.getByTestId("sidebar-toggle");

  // Check if toggle exists and get its state
  if (await desktopToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
    const dataState = await desktopToggle.getAttribute("data-state");

    if (dataState === "open") {
      return;
    }

    await desktopToggle.click();

    // Wait for state to change to open
    await page.waitForFunction(
      (selector) => {
        const element = document.querySelector(selector);
        return element?.getAttribute("data-state") === "open";
      },
      '[data-testid="sidebar-toggle"]',
      { timeout: 5000 },
    );

    // Give sidebar animation time to complete
    await page.waitForTimeout(500);
    return;
  }

  // Try mobile toggle as fallback
  const mobileToggle = page.getByTestId("sidebar-header-toggle-mobile");
  if (await mobileToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
    const dataState = await mobileToggle.getAttribute("data-state");

    if (dataState !== "open") {
      await mobileToggle.click();
      await page.waitForTimeout(500);
    }
  }

  // Verify sidebar is actually open by checking user button visibility
  const userMenuButton = page.getByTestId("sidebar-user-button");
  try {
    await userMenuButton.waitFor({ state: "visible", timeout: 5000 });
  } catch (_error) {
    throw new Error("Could not open sidebar");
  }
}
