import type { ReactNode } from "react";
import { SidebarProvider } from "ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { cookies } from "next/headers";
import { COOKIE_KEY_SIDEBAR_STATE } from "lib/const";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { UserDetailContent } from "@/components/user/user-detail/user-detail-content";
import { Suspense } from "react";
import { UserDetailContentSkeleton } from "@/components/user/user-detail/user-detail-content-skeleton";
import { redirect, unauthorized } from "next/navigation";
import { getSession } from "auth/server";
import { requireAdminPermission } from "auth/permissions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }
  const session = await getSession();
  if (!session || !session.user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AdminSidebar user={session.user} />
      <AppPopupProvider
        userSettingsComponent={
          <Suspense fallback={<UserDetailContentSkeleton />}>
            <UserDetailContent view="user" />
          </Suspense>
        }
      />
      {children}
    </SidebarProvider>
  );
}
