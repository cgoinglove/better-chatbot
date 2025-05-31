import { cookies, headers } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { VoiceChatBot } from "@/components/voice-chat-bot";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";


import { auth } from "@/lib/auth/server";
import Script from "next/script";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([
    auth.api.getSession({
      headers: await headers(),
    }),
    cookies(),
  ]);
  const isCollapsed = cookieStore.get("sidebar:state")?.value === "false";

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={session?.user} />
        <SidebarInset className="ml-64">
          <div className="flex flex-col h-full w-full relative overflow-hidden">
            {children}
          </div>
        </SidebarInset>

        <VoiceChatBot />
      </SidebarProvider>
    </>
  );
}
