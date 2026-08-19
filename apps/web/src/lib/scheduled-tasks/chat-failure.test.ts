import { describe, expect, it } from "vitest";
import { isTransientChatFailure } from "./chat-failure";

describe("isTransientChatFailure", () => {
  it("treats timeouts, rate limits, and server errors as transient", () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
      expect(isTransientChatFailure(status)).toBe(true);
    }
  });

  it("treats other client errors as permanent", () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(isTransientChatFailure(status)).toBe(false);
    }
  });
});
