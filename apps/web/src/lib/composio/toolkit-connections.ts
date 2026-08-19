import { COMPOSIO_PRIORITY_APPS } from "./priority";

export type MappedToolkit = {
  slug: string;
  name: string;
  logo?: string;
  isConnected: boolean;
  connectedAccountId?: string;
};

/**
 * Map raw `session.toolkits()` items to the /api/connections response shape,
 * reconciling the (lagging) toolkit connection flags with the authoritative
 * set of ACTIVE connected accounts (slug → account id). A toolkit counts as
 * connected when either source says so.
 */
export function mapToolkitsWithAccounts(
  items: any[],
  search?: string,
  activeAccounts?: Map<string, string>,
): MappedToolkit[] {
  return items
    .filter(
      (t) => !t.isNoAuth || activeAccounts?.has(String(t.slug).toLowerCase()),
    )
    .map((t) => {
      const fallbackAccountId = activeAccounts?.get(
        String(t.slug).toLowerCase(),
      );
      return {
        slug: t.slug,
        name: t.name,
        logo: t.logo,
        isConnected: (t.connection?.isActive ?? false) || !!fallbackAccountId,
        connectedAccountId:
          t.connection?.connectedAccount?.id ?? fallbackAccountId,
      };
    })
    .sort((a, b) => {
      if (!search) {
        const aIdx = COMPOSIO_PRIORITY_APPS.indexOf(a.slug);
        const bIdx = COMPOSIO_PRIORITY_APPS.indexOf(b.slug);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
      }
      return a.name.localeCompare(b.name);
    });
}

export type ComposioAccountCandidate = {
  id: string;
  isDisabled: boolean;
  createdAt?: string;
  toolkit: { slug: string };
};

/**
 * Pick the connected account to bind a project connector to. With an explicit
 * `connectionRef` the id must match exactly; without one (e.g. right after
 * OAuth, before the client learned the id) the newest active account for the
 * toolkit wins.
 */
export function resolveComposioAccount<T extends ComposioAccountCandidate>(
  items: T[],
  toolkitSlug: string,
  connectionRef?: string,
): T | undefined {
  const candidates = items.filter(
    (candidate) =>
      candidate.toolkit.slug.toLowerCase() === toolkitSlug &&
      !candidate.isDisabled,
  );

  if (connectionRef) {
    return candidates.find((candidate) => candidate.id === connectionRef);
  }

  return [...candidates].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime(),
  )[0];
}
