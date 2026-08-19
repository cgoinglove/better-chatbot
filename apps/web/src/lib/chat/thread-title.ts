import type { UIMessage } from "ai";
import { truncateString } from "lib/utils";

export function extractTitleSeedFromSendMessage(
  message: Parameters<
    import("@ai-sdk/react").UseChatHelpers<UIMessage>["sendMessage"]
  >[0],
): string | null {
  if (!message || typeof message !== "object") return null;

  const parts = "parts" in message ? message.parts : undefined;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .filter((part): part is { type: "text"; text: string } => {
      return (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
      );
    })
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n");

  if (!text) return null;
  return `user: ${truncateString(text, 500)}`;
}
