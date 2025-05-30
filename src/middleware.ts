import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Set default cookies if they don't exist
  const response = NextResponse.next();
  const modelCookie = request.cookies.get("chat-model");
  const toolChoiceCookie = request.cookies.get("tool-choice");

  if (!modelCookie) {
    response.cookies.set("chat-model", "4o");
  }
  if (!toolChoiceCookie) {
    response.cookies.set("tool-choice", "auto");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth|sign-in|sign-up).*)",
  ],
};
