import type { ModelMessage } from "ai";

/**
 * Attaches per-turn retrieval output to the last message.
 *
 * Retrieved chunks used to be concatenated into the system prompt. Because they
 * depend on the question just asked, that made the system prompt different on
 * every turn - and a changed system block invalidates the system *and* messages
 * caches, so every turn re-paid full price for the agent instructions, HITL
 * rules, skills and MCP customizations that had not changed at all. Keeping the
 * volatile half here leaves the system prompt byte-stable.
 *
 * Call this AFTER `withTrailingCacheBreakpoint`. The appended context is not
 * persisted - it exists only for this request - so next turn's history will not
 * contain it. Marking the breakpoint first leaves it on the user's real
 * question, which means the cached span is exactly what the next turn's prefix
 * looks like. Appending before the breakpoint would cache a span containing
 * text that vanishes next turn, and that breakpoint could never hit again.
 */
export const appendRetrievalContext = (
  messages: ModelMessage[],
  contexts: (string | undefined | false)[],
): ModelMessage[] => {
  const blocks = contexts
    .map((value) => (value ? value.trim() : ""))
    .filter(Boolean);

  if (!messages.length || !blocks.length) return messages;

  const lastIndex = messages.length - 1;
  const last = messages[lastIndex];

  const content =
    typeof last.content === "string"
      ? [{ type: "text" as const, text: last.content }]
      : last.content;

  if (!Array.isArray(content)) return messages;

  const next = [...messages];
  next[lastIndex] = {
    ...last,
    content: [...content, { type: "text" as const, text: blocks.join("\n\n") }],
  } as ModelMessage;

  return next;
};
