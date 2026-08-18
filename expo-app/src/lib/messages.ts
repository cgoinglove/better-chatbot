import type { MessagePart, UIMessage } from "./types";

export function createId(prefix = "msg") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createThreadId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createTextMessage(role: UIMessage["role"], text: string) {
  return {
    id: createId(role),
    role,
    parts: [{ type: "text", text }],
  } satisfies UIMessage;
}

export function getMessageText(message: UIMessage) {
  return message.parts
    .map((part) => {
      if (part.type === "text" && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function appendTextPart(message: UIMessage, text: string): UIMessage {
  const parts = [...message.parts];
  const last = parts.at(-1) as MessagePart | undefined;

  if (last?.type === "text" && typeof last.text === "string") {
    parts[parts.length - 1] = { ...last, text: `${last.text}${text}` };
  } else {
    parts.push({ type: "text", text });
  }

  return { ...message, parts };
}

export function getGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const label =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const suffix = name ? `, ${name.split(" ")[0]}` : "";

  return `${label}${suffix}`;
}
