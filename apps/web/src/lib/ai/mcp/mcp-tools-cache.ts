import type { MCPToolInfo } from "app-types/mcp";

/**
 * Per-warm-instance memo of each MCP server's introspected tool list.
 *
 * Listing tools means connect -> getToolInfo -> disconnect per enabled server,
 * which ran in the blocking pre-stream path on every chat request and added
 * 0.3-2s+ to TTFT. The tool list only changes when the server config changes,
 * so we cache it keyed by server id and versioned by the row's `updatedAt`: a
 * config save bumps `updatedAt`, which is loaded fresh from the DB every request
 * and produces a natural cache miss on every instance. That gives correct
 * invalidation across serverless instances without any explicit purge call.
 *
 * Mirrors the Composio tools memo in shared.chat.ts (in-process only; the tool
 * `execute` closures are rebuilt per request and connect lazily at call time).
 * Override the TTL with MCP_TOOLS_TTL_MS (default 5 min, matching Composio);
 * set to 0 to disable.
 */
const TTL_MS = (() => {
  const raw = Number(process.env.MCP_TOOLS_TTL_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 5 * 60 * 1000;
})();

type Entry = { version: string; toolInfo: MCPToolInfo[]; expiresAt: number };

// One entry per server id (Map.set overwrites stale versions), so memory is
// bounded to the number of distinct servers this instance has seen.
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<MCPToolInfo[]>>();

/** Non-blocking read: returns cached tool info only on a fresh, matching version. */
export function peekMcpToolInfo(
  serverId: string,
  version: string,
): MCPToolInfo[] | undefined {
  if (TTL_MS === 0) return undefined;
  const entry = cache.get(serverId);
  if (entry && entry.version === version && entry.expiresAt > Date.now()) {
    return entry.toolInfo;
  }
  return undefined;
}

/**
 * Return cached tool info or run `loader` (the connect+introspect) once,
 * caching the result and collapsing concurrent loads of the same version.
 * Only call after deciding the server is reachable — a rejected loader is not
 * cached, so a transient failure never poisons the entry.
 */
export function loadMcpToolInfoCached(
  serverId: string,
  version: string,
  loader: () => Promise<MCPToolInfo[]>,
): Promise<MCPToolInfo[]> {
  if (TTL_MS === 0) return loader();

  const cached = peekMcpToolInfo(serverId, version);
  if (cached) return Promise.resolve(cached);

  const flightKey = `${serverId}:${version}`;
  const existing = inflight.get(flightKey);
  if (existing) return existing;

  const promise = loader()
    .then((toolInfo) => {
      cache.set(serverId, {
        version,
        toolInfo,
        expiresAt: Date.now() + TTL_MS,
      });
      return toolInfo;
    })
    .finally(() => inflight.delete(flightKey));
  inflight.set(flightKey, promise);
  return promise;
}
