import { AppShell } from "@/components/layouts/app-shell";
import { getSession } from "lib/auth/server";
import { userRepository } from "lib/db/repository";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// No `experimental_ppr` opt-in here: `experimental.ppr` is not enabled in
// next.config.ts, so the segment export was inert. Re-add it only alongside the
// config flag.

// MCP OAuth server actions run under this segment's config. Cap them at 60s so a
// stalled DB reservation or refresh lock fails fast instead of riding the 300s
// default function timeout. (/api/chat keeps its own longer budget.)
export const maxDuration = 60;

export default async function ChatLayout({
  children,
}: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  // Onboarding gate. The completion cookie is device-local, so on a brand-new
  // device fall back to ONE server-side DB read instead of bouncing the
  // browser through /onboarding → /api/onboarding/complete → / — the old
  // middleware cookie gate did exactly that, which users experienced as the
  // app loading twice on first open. When the DB already says "done" we
  // render immediately and let the client backfill the cookie.
  let syncOnboardingCookie = false;
  if (!cookieStore.get("onboarding_complete")) {
    const preferences = await userRepository.getPreferences(session.user.id);
    if (preferences?.onboarding?.step === "done") {
      syncOnboardingCookie = true;
    } else {
      redirect("/onboarding");
    }
  }

  return (
    <AppShell user={session.user} syncOnboardingCookie={syncOnboardingCookie}>
      {children}
    </AppShell>
  );
}
