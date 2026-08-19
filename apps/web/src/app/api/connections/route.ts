import { composio } from "lib/composio/client";
import { mapToolkitsWithAccounts } from "lib/composio/toolkit-connections";
import { withAuth } from "auth/route-guard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Toolkit connection flags from `session.toolkits()` lag behind (or miss)
// accounts created through other auth flows, which made connected apps
// disappear from the list. Reconcile against the authoritative
// `connectedAccounts.list` — the same source the project-attach route uses.
async function listActiveAccountIdsByToolkit(userId: string) {
  const map = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const page = await composio.connectedAccounts.list({
      userIds: [userId],
      statuses: ["ACTIVE"],
      // Default is PRIVATE-only; include org/shared accounts (e.g. Slack via
      // a shared auth config) so they don't vanish from the connected list.
      accountType: "ALL",
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    for (const item of page?.items ?? []) {
      if (item?.isDisabled) continue;
      const slug = item?.toolkit?.slug?.toLowerCase();
      // Items arrive newest-first; keep the first id we see per toolkit.
      if (slug && !map.has(slug)) map.set(slug, item.id);
    }
    cursor = page?.nextCursor ?? undefined;
  } while (cursor);
  // Deliberate observability while "connected apps missing" reports are open:
  // shows in Vercel logs how many accounts the reconcile actually sees.
  console.info(
    `[connections GET] reconcile: ${map.size} toolkit(s) with active accounts`,
    [...map.keys()].join(", ") || "(none)",
  );
  return map;
}

// GET: List toolkits with connection status, priority-sorted
// ?paginate=true  → single page (fast); honours ?limit= and ?nextCursor=
// (default)       → legacy full-list mode for existing callers
export const GET = withAuth(async (req, session) => {
  try {
    const { searchParams } = new URL(req.url);
    // Composio rejects search queries under 3 characters (400). Treat short
    // queries as "no search" so typing in the dialog never breaks the list.
    const rawSearch = searchParams.get("search")?.trim();
    const search = rawSearch && rawSearch.length >= 3 ? rawSearch : undefined;
    const paginate = searchParams.get("paginate") === "true";
    const cursorParam = searchParams.get("nextCursor") ?? undefined;
    const requestedLimit = Number(searchParams.get("limit") ?? "60");
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 60;

    const composioSession = await composio.create(session.user.id);

    // Reconcile in parallel with the toolkit fetch; never fail the list if the
    // accounts call errors — fall back to the toolkit flags only.
    const activeAccountsPromise = listActiveAccountIdsByToolkit(
      session.user.id,
    ).catch((error) => {
      console.error(
        "[connections GET] connected-accounts reconcile failed:",
        error?.message ?? error,
      );
      return new Map<string, string>();
    });

    if (paginate) {
      const [page, activeAccounts]: [any, Map<string, string>] =
        await Promise.all([
          composioSession.toolkits({
            limit,
            ...(search ? { search } : {}),
            ...(cursorParam ? { nextCursor: cursorParam } : {}),
          }),
          activeAccountsPromise,
        ]);

      return NextResponse.json({
        toolkits: mapToolkitsWithAccounts(
          page.items ?? [],
          search,
          activeAccounts,
        ),
        nextCursor: page.nextCursor ?? null,
      });
    }

    // Legacy mode: exhaust all pages before responding
    const allItems: any[] = [];
    let cursor: string | undefined = undefined;
    do {
      const page: any = await composioSession.toolkits({
        limit: 50,
        ...(search ? { search } : {}),
        ...(cursor ? { nextCursor: cursor } : {}),
      });
      allItems.push(...(page.items ?? []));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    const activeAccounts = await activeAccountsPromise;

    return NextResponse.json({
      toolkits: mapToolkitsWithAccounts(allItems, search, activeAccounts),
    });
  } catch (error: any) {
    const detail =
      error?.response?.data ?? error?.cause ?? error?.message ?? String(error);
    console.error("[connections GET] Composio error:", JSON.stringify(detail));
    return NextResponse.json(
      { error: error.message || "Failed to fetch toolkits", detail },
      { status: 500 },
    );
  }
});

// POST: Start OAuth flow for a toolkit
export const POST = withAuth(async (req, session) => {
  try {
    const {
      toolkit,
      callbackUrl: bodyCallbackUrl,
    }: { toolkit: string; callbackUrl?: string } = await req.json();
    const origin = new URL(req.url).origin;
    const resolvedCallbackUrl = bodyCallbackUrl ?? origin;
    const composioSession = await composio.create(session.user.id);
    const connectionRequest = await composioSession.authorize(toolkit, {
      callbackUrl: resolvedCallbackUrl,
    });

    return NextResponse.json({ redirectUrl: connectionRequest.redirectUrl });
  } catch (error: any) {
    const detail =
      error?.response?.data ?? error?.cause ?? error?.message ?? String(error);
    console.error("[connections POST] Composio error:", JSON.stringify(detail));
    return NextResponse.json(
      { error: error.message || "Failed to initiate OAuth", detail },
      { status: 500 },
    );
  }
});
