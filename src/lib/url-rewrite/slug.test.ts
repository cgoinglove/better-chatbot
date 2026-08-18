import { describe, expect, it, vi } from "vitest";
import {
  generateSlug,
  generateUniqueSlug,
  isValidSlug,
  normalizeSlug,
} from "./slug";
import { URL_REWRITE_SLUG_LENGTH } from "app-types/url-rewrite";

describe("generateSlug", () => {
  it("uses the configured length and an unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateSlug();
      expect(slug).toHaveLength(URL_REWRITE_SLUG_LENGTH);
      expect(slug).toMatch(/^[a-hjkmnp-z2-9]+$/);
    }
  });
});

describe("normalizeSlug", () => {
  it("lowercases and trims so /goto/AbC123 resolves", () => {
    expect(normalizeSlug("  AbC123 ")).toBe("abc123");
  });
});

describe("isValidSlug", () => {
  it.each(["abc", "abc123", "my-link_1", "a".repeat(64)])(
    "accepts %s",
    (slug) => {
      expect(isValidSlug(slug)).toBe(true);
    },
  );

  it.each(["ab", "-abc", "_abc", "a b", "abc!", "a".repeat(65), ""])(
    "rejects %s",
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
    },
  );
});

describe("generateUniqueSlug", () => {
  it("retries until it finds a free slug", async () => {
    const exists = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const slug = await generateUniqueSlug(exists);

    expect(exists).toHaveBeenCalledTimes(3);
    expect(slug).toHaveLength(URL_REWRITE_SLUG_LENGTH);
  });

  it("widens the keyspace instead of failing when every attempt collides", async () => {
    const exists = vi.fn().mockResolvedValue(true);

    const slug = await generateUniqueSlug(exists, 3);

    expect(exists).toHaveBeenCalledTimes(3);
    expect(slug).toHaveLength(URL_REWRITE_SLUG_LENGTH + 2);
  });
});
