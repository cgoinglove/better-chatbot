import { describe, expect, it } from "vitest";
import { storageKeyFromUrl } from "./storage-utils";

describe("storageKeyFromUrl", () => {
  it("extracts key from absolute URL", () => {
    expect(storageKeyFromUrl("https://example.com/uploads/sample.csv")).toBe(
      "uploads/sample.csv",
    );
  });

  it("decodes encoded path segments", () => {
    expect(
      storageKeyFromUrl(
        "https://example.com/uploads/My%20File%20(1).csv?token=123",
      ),
    ).toBe("uploads/My File (1).csv");
  });

  it("returns null for invalid URLs", () => {
    expect(storageKeyFromUrl("not-a-url")).toBeNull();
  });
});
