import { Page } from "@playwright/test";

/**
 * Generate a unique test name with timestamp and random string
 */
export function uniqueTestName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Click an element and wait for navigation to complete
 * Prevents race conditions between click and navigation
 */
export async function clickAndWaitForNavigation(
  page: Page,
  selector: string,
  urlPattern: string,
  options = { timeout: 10000 },
) {
  await Promise.all([
    page.waitForURL(urlPattern, options),
    page.getByTestId(selector).click(),
  ]);
}

/**
 * Click a dropdown button and wait for menu to appear
 * Handles flaky shadcn dropdown behaviors
 */
export async function openDropdown(
  page: Page,
  buttonSelector: string,
  menuSelector = '[role="menu"]',
  timeout = 5000,
) {
  const button = page.getByTestId(buttonSelector);
  await button.click();

  const menu = page.locator(menuSelector);
  await menu.waitFor({ state: "visible", timeout });
  return menu;
}

/**
 * Select an option from an open dropdown menu
 */
export async function selectDropdownOption(
  page: Page,
  optionSelector: string,
  timeout = 5000,
) {
  const option = page.getByTestId(optionSelector);
  await option.waitFor({ state: "visible", timeout });
  await option.click();

  // Wait for menu to close
  await option.waitFor({ state: "hidden", timeout });
}
