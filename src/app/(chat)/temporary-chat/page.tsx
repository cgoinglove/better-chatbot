import ChatBot from "@/components/chat-bot";
import { generateUUID } from "lib/utils";
import { MessageCircleDashed } from "lucide-react";

export default function TemporaryChatPage() {
  const id = generateUUID();
  return (
    <ChatBot
      initialMessages={[]}
      action="temporary-chat"
      threadId={id}
      key={id}
      slots={{
        emptySlot: <EmptySlot />,
        inputBottomSlot: <InputBottomSlot />,
      }}
    />
  );
}

function EmptySlot() {
  return (
    <div className="max-w-3xl mx-auto my-4">
      {" "}
      <div className="rounded-xl p-6 flex flex-col gap-2 leading-relaxed text-center">
        <h1 className="text-4xl font-semibold ">
          This chat won&apos;t be saved.
        </h1>
        <div className="text-muted-foreground text-2xl flex items-center gap-2">
          <p>Feel free to ask anything temporarily</p>
          <MessageCircleDashed />
        </div>
      </div>
    </div>
  );
}

function InputBottomSlot() {
  return (
    <div className="max-w-3xl mx-auto text-xs text-muted-foreground text-center pt-4">
      This is a temporary chat session.
    </div>
  );
}
