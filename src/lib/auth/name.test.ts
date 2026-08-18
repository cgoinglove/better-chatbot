import { describe, expect, it } from "vitest";
import { getFirstName } from "./name";

describe("getFirstName", () => {
  it("returns the first whitespace-delimited part of a full name", () => {
    expect(getFirstName("  Ada   Lovelace ")).toBe("Ada");
  });

  it("handles names containing only whitespace", () => {
    expect(getFirstName("   ")).toBe("");
  });
});
