import { describe, expect, it } from "vitest";
import {
  isUrlRewriteActive,
  UrlRewriteCreateSchema,
  UrlRewriteTargetSchema,
} from "./url-rewrite";

const baseInput = {
  slug: "abc123",
  name: "Spring campaign",
  target: {
    targetKind: "chat" as const,
    preset: {},
  },
};

describe("UrlRewriteCreateSchema", () => {
  it("defaults to enabled", () => {
    const result = UrlRewriteCreateSchema.parse(baseInput);
    expect(result.enabled).toBe(true);
  });

  it("rejects slugs that cannot appear in a url", () => {
    expect(
      UrlRewriteCreateSchema.safeParse({ ...baseInput, slug: "a b" }).success,
    ).toBe(false);
  });

  it("accepts a full chat preset", () => {
    const result = UrlRewriteCreateSchema.safeParse({
      ...baseInput,
      target: {
        targetKind: "chat",
        preset: {
          chatModel: { provider: "openai", model: "gpt-4.1" },
          toolChoice: "auto",
          allowedAppDefaultToolkit: ["webSearch"],
          allowedMcpServers: { "server-id": { tools: ["search"] } },
          mentions: [
            { type: "agent", name: "Researcher", agentId: "agent-id" },
          ],
          message: { text: "Hello", mode: "send" },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown message mode", () => {
    const result = UrlRewriteTargetSchema.safeParse({
      targetKind: "chat",
      preset: { message: { text: "Hello", mode: "shout" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown target kind", () => {
    expect(
      UrlRewriteTargetSchema.safeParse({ targetKind: "teleport", preset: {} })
        .success,
    ).toBe(false);
  });
});

describe("isUrlRewriteActive", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("is active when enabled and unexpired", () => {
    expect(
      isUrlRewriteActive(
        { enabled: true, expiresAt: new Date("2026-01-02T00:00:00Z") },
        now,
      ),
    ).toBe(true);
  });

  it("is active when enabled without an expiry", () => {
    expect(isUrlRewriteActive({ enabled: true, expiresAt: null }, now)).toBe(
      true,
    );
  });

  it("is inactive when disabled", () => {
    expect(isUrlRewriteActive({ enabled: false, expiresAt: null }, now)).toBe(
      false,
    );
  });

  it("is inactive once expired", () => {
    expect(
      isUrlRewriteActive(
        { enabled: true, expiresAt: new Date("2025-12-31T23:59:59Z") },
        now,
      ),
    ).toBe(false);
  });
});
