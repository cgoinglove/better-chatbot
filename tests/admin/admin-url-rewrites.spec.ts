import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

const LIST_URL = "/admin/url-rewrites";

/** Slugs are globally unique, so each run needs its own. */
const uniqueSlug = () =>
  `e2e${Math.random().toString(36).slice(2, 8)}`.slice(0, 9);

test.describe("Admin URL Rewrites", () => {
  test.use({ storageState: TEST_USERS.admin.authFile });

  test("creates a prefill link and applies it to a visitor's chat", async ({
    page,
  }) => {
    const slug = uniqueSlug();
    const message = `Prefilled by ${slug}`;

    await page.goto(LIST_URL);
    await page.waitForSelector("[data-testid='url-rewrites-table']");

    await page.getByTestId("url-rewrite-new-button").click();
    await page.waitForURL(`**${LIST_URL}/new`);

    // The form suggests a free slug up front.
    expect(await page.getByTestId("url-rewrite-slug").inputValue()).not.toBe(
      "",
    );

    await page.getByTestId("url-rewrite-name").fill(`E2E ${slug}`);
    await page.getByTestId("url-rewrite-slug").fill(slug);
    await page.getByTestId("url-rewrite-message").fill(message);
    await page.getByTestId("url-rewrite-save").click();

    await page.waitForURL(`**${LIST_URL}`);
    await expect(page.getByTestId(`url-rewrite-row-${slug}`)).toBeVisible();

    // Opening the link drops the visitor into a new chat with the message ready.
    await page.goto(`/goto/${slug}`);
    await page.waitForURL("/");
    await expect(page.locator(".tiptap").first()).toContainText(message);

    // The link is consumed: a fresh chat does not repeat it.
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".tiptap").first()).not.toContainText(message);
  });

  test("rejects a slug that is already taken", async ({ page }) => {
    const slug = uniqueSlug();

    await page.goto(`${LIST_URL}/new`);
    await page.getByTestId("url-rewrite-name").fill(`E2E ${slug}`);
    await page.getByTestId("url-rewrite-slug").fill(slug);
    await page.getByTestId("url-rewrite-save").click();
    await page.waitForURL(`**${LIST_URL}`);

    await page.getByTestId("url-rewrite-new-button").click();
    await page.waitForURL(`**${LIST_URL}/new`);
    await page.getByTestId("url-rewrite-slug").fill(slug);

    await expect(page.getByTestId("url-rewrite-slug-status")).toHaveText(
      "Already taken",
    );
    await expect(page.getByTestId("url-rewrite-save")).toBeDisabled();
  });

  test("a disabled link falls back to an ordinary new chat", async ({
    page,
  }) => {
    const slug = uniqueSlug();
    const message = `Should not appear ${slug}`;

    await page.goto(`${LIST_URL}/new`);
    await page.getByTestId("url-rewrite-name").fill(`E2E ${slug}`);
    await page.getByTestId("url-rewrite-slug").fill(slug);
    await page.getByTestId("url-rewrite-message").fill(message);
    await page.getByTestId("url-rewrite-enabled").click(); // disable
    await page.getByTestId("url-rewrite-save").click();
    await page.waitForURL(`**${LIST_URL}`);

    await page.goto(`/goto/${slug}`);
    await page.waitForURL("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".tiptap").first()).not.toContainText(message);
  });

  test("deletes a link", async ({ page }) => {
    const slug = uniqueSlug();

    await page.goto(`${LIST_URL}/new`);
    await page.getByTestId("url-rewrite-name").fill(`E2E ${slug}`);
    await page.getByTestId("url-rewrite-slug").fill(slug);
    await page.getByTestId("url-rewrite-save").click();
    await page.waitForURL(`**${LIST_URL}`);

    const row = page.getByTestId(`url-rewrite-row-${slug}`);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Delete link" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete link" })
      .click();

    await expect(row).toBeHidden();
  });
});

test.describe("URL Rewrites permissions", () => {
  test.use({ storageState: TEST_USERS.regular.authFile });

  test("a non-admin cannot reach the admin page", async ({ page }) => {
    await page.goto(LIST_URL);
    await expect(page.getByText("401")).toBeVisible();
    await expect(page.getByTestId("url-rewrites-table")).toBeHidden();
  });
});
