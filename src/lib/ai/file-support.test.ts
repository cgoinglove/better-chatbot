import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILE_PART_MIME_TYPES,
  isFilePartSupported,
} from "./file-support";

describe("file-support", () => {
  it("returns false when mime is missing", () => {
    expect(isFilePartSupported(undefined)).toBe(false);
  });

  it("returns true for default supported image types", () => {
    expect(isFilePartSupported("image/jpeg")).toBe(true);
    expect(isFilePartSupported("image/png")).toBe(true);
    expect(isFilePartSupported("image/webp")).toBe(true);
    expect(isFilePartSupported("image/gif")).toBe(true);
  });

  it("returns true for default supported document types", () => {
    expect(isFilePartSupported("application/pdf")).toBe(true);
  });

  it("returns false for unsupported mime types by default", () => {
    expect(isFilePartSupported("text/plain")).toBe(false);
    expect(isFilePartSupported("application/vnd.ms-excel")).toBe(false);
  });

  it("respects an explicitly provided mime whitelist", () => {
    const whitelist = ["application/pdf"];
    expect(isFilePartSupported("application/pdf", whitelist)).toBe(true);
    expect(isFilePartSupported("image/png", whitelist)).toBe(false);
  });

  it("treats an empty whitelist as no support", () => {
    expect(isFilePartSupported("image/png", [])).toBe(false);
  });

  it("exposes the default mime types constant", () => {
    expect(DEFAULT_FILE_PART_MIME_TYPES).toContain("application/pdf");
    expect(DEFAULT_FILE_PART_MIME_TYPES).toContain("image/jpeg");
  });
});
