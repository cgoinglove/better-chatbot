import { NextResponse } from "next/server";
import { COOKIE_KEY_GOTO_INTENT } from "lib/const";

/**
 * Clears the pending `/goto/{slug}` cookie once the client has applied the
 * preset, which is what keeps a "send" link from firing again on a reload.
 *
 * This is deliberately a route handler rather than a server action: calling a
 * server action from the home page makes Next re-render that page, and since
 * the home page mints a fresh thread id (and therefore a fresh `key`) on every
 * render, the chat would remount and drop the message just prefilled into it.
 */
export async function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(COOKIE_KEY_GOTO_INTENT);
  return response;
}
