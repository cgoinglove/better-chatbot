import ChatBot from "@/components/chat-bot";
import { generateUUID } from "lib/utils";

export default function HomePage() {
  const id = generateUUID();
  return <ChatBot initialMessages={[]} threadId={id} key={id} />;
}
