import { AppHeader } from "@/components/layouts/app-header";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { cookies } from "next/headers";
import { SidebarProvider } from "ui/sidebar";

import { CloudProviders } from "@/components/gate/providers";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { SWRConfigProvider } from "@/components/layouts/swr-config";
import { OnboardingCookieSync } from "@/components/onboarding/onboarding-cookie-sync";
import { COOKIE_KEY_SIDEBAR_STATE } from "lib/const";

import type { BasicUser } from "app-types/user";

/**
 * The authenticated application shell (sidebar, header, providers).
 *
 * Extracted from the `(chat)` layout so the pre-onboarding invitation route
 * can render the same surface behind its blocking dialog. The onboarding gate
 * stays in the layouts that own it — this component renders whatever it is
 * given.
 */
export async function AppShell({
  user,
  syncOnboardingCookie = false,
  children,
}: {
  user: BasicUser;
  syncOnboardingCookie?: boolean;
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value !== "true";

  const content = (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <SWRConfigProvider user={user}>
        {syncOnboardingCookie && <OnboardingCookieSync />}
        <AppPopupProvider />
        <AppSidebar user={user} />
        {/* `overflow-hidden` clips absolutely-positioned descendants — the
              composer, drag overlay, gradients — to the area below the header,
              so nothing can paint in the header's row. `min-w-0` keeps this
              flex child from being widened by an over-wide descendant
              (diagrams, tables, long code lines) — without it a single wide
              message stretches the whole shell and the page can be swiped
              sideways on touch devices. */}
        <main className="relative bg-background w-full min-w-0 flex flex-col overflow-hidden h-dvh">
          <AppHeader />
          {/* The header is a sibling row, so this bounded region always
                starts below it. `overscroll-contain` stops an iOS rubber-band
                scroll inside the chat from chaining out here and dragging the
                content up behind the header; `overflow-x-hidden` clips the
                horizontal overflow the `min-w-0` above no longer propagates. */}
          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            {children}
          </div>
        </main>
      </SWRConfigProvider>
    </SidebarProvider>
  );

  return <CloudProviders user={user}>{content}</CloudProviders>;
}
