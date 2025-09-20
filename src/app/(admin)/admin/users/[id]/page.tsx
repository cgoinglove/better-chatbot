import { notFound, redirect, unauthorized } from "next/navigation";
import { getUserAccounts, getUser } from "lib/user/server";
import { UserDetail } from "@/components/user/user-detail/user-detail";
import {
  UserStatsCardLoader,
  UserStatsCardLoaderSkeleton,
} from "@/components/user/user-detail/user-stats-card-loader";
import { BackButton } from "@/components/admin/back-button";
import { buildReturnUrl } from "@/lib/admin/navigation-utils";

import { Suspense } from "react";
import { getSession } from "auth/server";
import { requireAdminPermission } from "auth/permissions";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    searchPageParams?: string;
  }>;
}

export default async function UserDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { searchPageParams } = await searchParams;
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const [user, userAccountInfo] = await Promise.all([
    getUser(id),
    getUserAccounts(id),
  ]);

  if (!user) {
    notFound();
  }

  // Calculate return URL server-side
  const returnUrl = buildReturnUrl("/admin/users", searchPageParams || "");

  return (
    <>
      {/* Back button and breadcrumb */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <BackButton returnUrl={returnUrl} />
        </div>
      </div>

      <UserDetail
        user={user}
        currentUserId={session.user.id}
        userAccountInfo={userAccountInfo}
        userStatsSlot={
          <Suspense fallback={<UserStatsCardLoaderSkeleton />}>
            <UserStatsCardLoader userId={id} view="admin" />
          </Suspense>
        }
        view="admin"
      />
    </>
  );
}
