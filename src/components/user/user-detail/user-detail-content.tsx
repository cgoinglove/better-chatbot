import {
  getUser,
  getUserAccounts,
  getUserIdAndCheckAccess,
} from "lib/user/server";
import { notFound } from "next/navigation";
import { UserDetail } from "./user-detail";
import {
  UserStatsCardLoader,
  UserStatsCardLoaderSkeleton,
} from "./user-stats-card-loader";
import { Suspense } from "react";

export async function UserDetailContent({
  userId,
  view = "admin",
}: {
  userId?: string;
  view?: "admin" | "user";
}) {
  const currentUserId = await getUserIdAndCheckAccess(userId);

  const [user, userAccounts] = await Promise.all([
    getUser(userId),
    getUserAccounts(userId),
  ]);

  if (!user) {
    notFound();
  }

  // For the stats, use the resolved user ID (which will be the current user for non-admins)
  const statsUserId = userId || currentUserId;

  return (
    <UserDetail
      view={view}
      user={user}
      currentUserId={currentUserId}
      userAccountInfo={userAccounts}
      userStatsSlot={
        <Suspense fallback={<UserStatsCardLoaderSkeleton />}>
          <UserStatsCardLoader userId={statsUserId} view={view} />
        </Suspense>
      }
    />
  );
}
