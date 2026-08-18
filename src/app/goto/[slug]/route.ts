import { NextResponse } from "next/server";
import { getActiveUrlRewrite } from "lib/url-rewrite/server";
import {
  BASE_URL,
  COOKIE_KEY_GOTO_INTENT,
  GOTO_INTENT_MAX_AGE,
  IS_DEV,
} from "lib/const";
import { generateUUID } from "lib/utils";
import logger from "logger";

/**
 * Entry point for admin-created marketing links.
 *
 * The link is resolved here, stored in a short-lived cookie and the visitor is
 * sent to the app root. Using a cookie rather than a query string is what makes
 * the link survive the auth redirects: `/` bounces logged-out visitors to
 * `/sign-in`, and every sign-in / sign-up / OAuth path lands back on `/`, where
 * the cookie is still present and gets applied.
 *
 * This route is excluded from the proxy auth gate (see `src/proxy.ts`) so that
 * logged-out visitors reach it at all.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const home = new URL("/", BASE_URL);

  const rewrite = await getActiveUrlRewrite(slug).catch((error) => {
    logger.error(`Failed to resolve url rewrite "${slug}"`, error);
    return null;
  });

  if (!rewrite) {
    // Unknown, disabled or expired link - drop the visitor into the app instead
    // of showing an error page they can do nothing about.
    return NextResponse.redirect(home);
  }

  const response = NextResponse.redirect(home);
  response.cookies.set({
    name: COOKIE_KEY_GOTO_INTENT,
    value: `${rewrite.slug}.${generateUUID()}`,
    httpOnly: true,
    sameSite: "lax",
    secure: !IS_DEV,
    path: "/",
    maxAge: GOTO_INTENT_MAX_AGE,
  });
  return response;
}
