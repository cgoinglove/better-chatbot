import type { ModelMessage } from "ai";
import { describe, expect, it } from "vitest";
import { ANTHROPIC_CACHE_CONTROL } from "lib/ai/prompt-cache";
import { appendRetrievalContext } from "./retrieval-context";

const conversation = (): ModelMessage[] =>
  [
    { role: "user", content: [{ type: "text", text: "earlier" }] },
    { role: "assistant", content: [{ type: "text", text: "ok" }] },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "what does the contract say?",
          providerOptions: ANTHROPIC_CACHE_CONTROL,
        },
      ],
    },
  ] as ModelMessage[];

const lastParts = (messages: ModelMessage[]) =>
  messages[messages.length - 1].content as any[];

describe("appendRetrievalContext", () => {
  it("appends context to the last message", () => {
    const result = appendRetrievalContext(conversation(), [
      "<project_knowledge_retrieval>[1] chunk</project_knowledge_retrieval>",
    ]);
    const parts = lastParts(result);

    expect(parts).toHaveLength(2);
    expect(parts[1].text).toContain("[1] chunk");
  });

  it("keeps the cache breakpoint on the user's question, not the context", () => {
    // The appended context is not persisted, so next turn's history ends at the
    // question. The breakpoint has to stay there for the span to match again.
    const parts = lastParts(
      appendRetrievalContext(conversation(), ["<x>chunk</x>"]),
    );

    expect(parts[0].providerOptions).toBe(ANTHROPIC_CACHE_CONTROL);
    expect(parts[1].providerOptions).toBeUndefined();
  });

  it("joins multiple context blocks", () => {
    const parts = lastParts(
      appendRetrievalContext(conversation(), ["<a>one</a>", "<b>two</b>"]),
    );

    expect(parts[1].text).toBe("<a>one</a>\n\n<b>two</b>");
  });

  it("leaves messages untouched when every block is empty", () => {
    const messages = conversation();
    expect(
      appendRetrievalContext(messages, ["", "   ", undefined, false]),
    ).toBe(messages);
  });

  it("does not touch earlier turns", () => {
    const messages = conversation();
    const result = appendRetrievalContext(messages, ["<x>chunk</x>"]);

    expect(result[0]).toBe(messages[0]);
    expect(result[1]).toBe(messages[1]);
  });

  it("promotes string content so the context has somewhere to go", () => {
    const messages = [{ role: "user", content: "plain" }] as ModelMessage[];
    const parts = lastParts(appendRetrievalContext(messages, ["<x>c</x>"]));

    expect(parts).toEqual([
      { type: "text", text: "plain" },
      { type: "text", text: "<x>c</x>" },
    ]);
  });

  it("no-ops on an empty conversation", () => {
    const messages: ModelMessage[] = [];
    expect(appendRetrievalContext(messages, ["<x>c</x>"])).toBe(messages);
  });
});
