import { describe, it, expect } from "vitest";
import {
  insertPluginSchema,
  updatePluginSchema,
  canModifyPlugin,
  canSeedPlugins,
} from "./validations";

// A-05: POST body validation
describe("updatePluginSchema", () => {
  it("accepts partial plugin update", () => {
    const result = updatePluginSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid category on update", () => {
    const result = updatePluginSchema.safeParse({ category: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("insertPluginSchema", () => {
  it("accepts valid plugin body", () => {
    const result = insertPluginSchema.safeParse({
      name: "My Plugin",
      description: "A test plugin",
      category: "custom",
      icon: "Sparkles",
      color: "bg-blue-500/10 text-blue-500",
      systemPromptAddition: "You are helpful.",
      skills: [],
      commands: [],
      isPublic: false,
      version: "1.0.0",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = insertPluginSchema.safeParse({ description: "No name" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = insertPluginSchema.safeParse({
      name: "X",
      category: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

// A-06: owner check
describe("canModifyPlugin", () => {
  it("returns true when user owns the plugin", () => {
    expect(
      canModifyPlugin({ userId: "u1", isBuiltIn: false }, "u1", false),
    ).toBe(true);
  });

  it("returns false when user does not own and is not admin", () => {
    expect(
      canModifyPlugin({ userId: "u1", isBuiltIn: false }, "u2", false),
    ).toBe(false);
  });

  it("returns true for admin even on other user plugin", () => {
    expect(
      canModifyPlugin({ userId: "u1", isBuiltIn: false }, "u2", true),
    ).toBe(true);
  });

  it("returns false for non-admin on built-in plugin", () => {
    expect(
      canModifyPlugin({ userId: null, isBuiltIn: true }, "u1", false),
    ).toBe(false);
  });
});

// A-08: seed permission
describe("canSeedPlugins", () => {
  it("returns true for admin role", () => {
    expect(canSeedPlugins("admin")).toBe(true);
  });

  it("returns false for user role", () => {
    expect(canSeedPlugins("user")).toBe(false);
  });
});
