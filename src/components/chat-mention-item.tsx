import { ChatMention } from "app-types/chat";

export function ChatMentionItem({ mention }: { mention: ChatMention }) {
  return <div className="bg-red-400">{mention.type}</div>;
}
