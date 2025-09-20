import ChatBot from "@/components/chat-bot";
import { generateUUID } from "lib/utils";
import { getSession } from "auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const id = generateUUID();
  return <ChatBot initialMessages={[]} threadId={id} key={id} />;
}
