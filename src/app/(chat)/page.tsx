import ChatBot from "@/components/chat-bot";
import { generateUUID } from "lib/utils";
import { getSession } from "auth/server";
import { redirect } from "next/navigation";
import { readGotoIntent } from "lib/url-rewrite/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  // A pending `/goto/{slug}` link is resolved here: every auth path lands on
  // this page, so a preset survives sign-in, sign-up and OAuth round trips.
  const urlRewriteIntent = await readGotoIntent(session.user.id);
  const id = generateUUID();
  return (
    <ChatBot
      initialMessages={[]}
      threadId={id}
      key={id}
      urlRewriteIntent={urlRewriteIntent}
    />
  );
}
