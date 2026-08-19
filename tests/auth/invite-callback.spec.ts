import { expect, test } from "@playwright/test";

const INVITE_PATH = "/accept-invitation/11111111-1111-4111-8111-111111111111";
const ENCODED_INVITE = encodeURIComponent(INVITE_PATH);

test.describe("Invitation link survives the authentication detour", () => {
  test("an unauthenticated invite link keeps the invitation as callbackUrl", async ({
    page,
  }) => {
    await page.goto(INVITE_PATH);
    await page.waitForLoadState("networkidle");

    const url = new URL(page.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("callbackUrl")).toBe(INVITE_PATH);
  });

  test("the sign-in page links to sign-up with the callback attached", async ({
    page,
  }) => {
    await page.goto(`/sign-in?callbackUrl=${ENCODED_INVITE}`);
    await page.waitForLoadState("networkidle");

    const signUpLink = page.locator(`a[href*="/sign-up"]`).first();
    await expect(signUpLink).toHaveAttribute(
      "href",
      new RegExp(`callbackUrl=${encodeURIComponent(ENCODED_INVITE)}`),
    );
  });

  test("the email sign-up step is reachable without a session and keeps the callback", async ({
    page,
  }) => {
    // Regression: /sign-up/email was missing from the middleware allowlist, so
    // an unauthenticated user was bounced to a bare /sign-in and the invitation
    // link was lost mid-signup.
    await page.goto(`/sign-up/email?callbackUrl=${ENCODED_INVITE}`);
    await page.waitForLoadState("networkidle");

    const url = new URL(page.url());
    expect(url.pathname).toBe("/sign-up/email");
    expect(url.searchParams.get("callbackUrl")).toBe(INVITE_PATH);
  });

  test("the sign-up page hands the callback to the email step", async ({
    page,
  }) => {
    await page.goto(`/sign-up?callbackUrl=${ENCODED_INVITE}`);
    await page.waitForLoadState("networkidle");

    const emailLink = page.locator(`a[href*="/sign-up/email"]`).first();
    await expect(emailLink).toHaveAttribute(
      "href",
      new RegExp(`callbackUrl=${encodeURIComponent(ENCODED_INVITE)}`),
    );
  });
});
