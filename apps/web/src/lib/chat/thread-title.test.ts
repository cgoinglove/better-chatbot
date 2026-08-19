import { describe, expect, it } from "vitest";
import { extractTitleSeedFromSendMessage } from "./thread-title";

describe("extractTitleSeedFromSendMessage", () => {
  it("extracts user text from a send payload", () => {
    expect(
      extractTitleSeedFromSendMessage({
        role: "user",
        parts: [{ type: "text", text: "Summarize the shareholder agreement" }],
      }),
    ).toBe("user: Summarize the shareholder agreement");
  });
});
