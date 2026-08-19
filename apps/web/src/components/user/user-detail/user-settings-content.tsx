"use client";

import type { BasicUserWithLastLogin } from "app-types/user";
import { fetcher } from "lib/utils";
import useSWR from "swr";
import { UserDetail } from "./user-detail";
import { UserDetailContentSkeleton } from "./user-detail-content-skeleton";
import { UserStatisticsCard } from "./user-statistics-card";

type SettingsContext = {
  currentUserId: string;
  user: BasicUserWithLastLogin;
  userAccountInfo: { hasPassword: boolean; oauthProviders: string[] };
  stats: {
    threadCount: number;
    messageCount: number;
    modelStats: Array<{
      model: string;
      messageCount: number;
      totalTokens: number;
      provider: string;
    }>;
    totalTokens: number;
    period: string;
  };
};

/**
 * Client-side self-view settings content. Fetches user, accounts and stats in a
 * single request the first time it mounts (which only happens when the settings
 * drawer opens), replacing the layout's eager per-page-load server render.
 */
export function UserSettingsContent({
  view = "user",
}: {
  view?: "admin" | "user";
}) {
  const { data } = useSWR<SettingsContext>(
    "/api/user/settings-context",
    fetcher,
  );

  if (!data?.user) {
    return <UserDetailContentSkeleton />;
  }

  return (
    <UserDetail
      view={view}
      user={data.user}
      currentUserId={data.currentUserId}
      userAccountInfo={data.userAccountInfo}
      userStatsSlot={
        <UserStatisticsCard
          stats={{ ...data.stats, period: "Last 30 Days" }}
          view={view}
        />
      }
    />
  );
}
