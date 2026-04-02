// src/lib/plugins/plugin-utils.test.ts
import { describe, it, expect } from "vitest";
import {
  mergePluginWithUserState,
  dedupePluginsById,
  buildPluginsSystemPrompt,
  findCommandBySlug,
} from "./plugin-utils";
import type { Plugin, UserPlugin } from "app-types/plugin";

const basePlugin: Plugin = {
  id: "p1",
  tenantId: "tenant-1",
  userId: null,
  name: "Customer Success",
  description: "CS plugin",
  category: "productivity",
  icon: "HeartHandshake",
  color: "bg-teal-500/10 text-teal-500",
  systemPromptAddition: "You are a CS assistant.",
  skills: [
    {
      id: "s1",
      name: "QBR Prep",
      description: "Build QBR",
      longDescription: "Build a QBR",
      prompt: "Help me prep a QBR",
      category: "productivity",
      tags: ["QBR"],
    },
  ],
  commands: [
    {
      id: "c1",
      slug: "qbr-prep",
      name: "QBR Prep",
      description: "Prep QBR",
      prompt: "Help me prep a QBR",
    },
  ],
  isBuiltIn: true,
  isPublic: true,
  version: "1.0.0",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseUserPlugin: UserPlugin = {
  id: "up1",
  userId: "user-1",
  pluginId: "p1",
  enabled: true,
  isPinned: false,
  customSystemPrompt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// R-03: no userState when no UserPlugin row
describe("mergePluginWithUserState", () => {
  it("returns userState null when no UserPlugin row exists", () => {
    const result = mergePluginWithUserState(basePlugin, null);
    expect(result.userState).toBeNull();
  });

  // R-08: customSystemPrompt is accessible via userState
  it("returns userState with customSystemPrompt when UserPlugin exists", () => {
    const userPlugin = {
      ...baseUserPlugin,
      customSystemPrompt: "Custom override",
    };
    const result = mergePluginWithUserState(basePlugin, userPlugin);
    expect(result.userState?.customSystemPrompt).toBe("Custom override");
  });

  it("merges enabled and isPinned from UserPlugin", () => {
    const result = mergePluginWithUserState(basePlugin, baseUserPlugin);
    expect(result.userState?.enabled).toBe(true);
    expect(result.userState?.isPinned).toBe(false);
  });
});

// S-05: deduplicate by id
describe("dedupePluginsById", () => {
  it("removes duplicate plugin entries keeping first occurrence", () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const result = dedupePluginsById([p, p]);
    expect(result).toHaveLength(1);
  });

  it("keeps all unique plugins", () => {
    const p1 = mergePluginWithUserState(basePlugin, null);
    const p2 = mergePluginWithUserState({ ...basePlugin, id: "p2" }, null);
    expect(dedupePluginsById([p1, p2])).toHaveLength(2);
  });
});

// S-01: no block when no plugins
describe("buildPluginsSystemPrompt", () => {
  it("returns empty string when no plugins", () => {
    expect(buildPluginsSystemPrompt([])).toBe("");
  });

  // S-02: includes plugin name and addition
  it("wraps each plugin systemPromptAddition in named plugin tag", () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const result = buildPluginsSystemPrompt([p]);
    expect(result).toContain("<active_plugins>");
    expect(result).toContain('<plugin name="Customer Success">');
    expect(result).toContain("You are a CS assistant.");
    expect(result).toContain("</plugin>");
    expect(result).toContain("</active_plugins>");
  });

  // S-03: customSystemPrompt overrides default
  it("uses customSystemPrompt over systemPromptAddition when present", () => {
    const userPlugin = {
      ...baseUserPlugin,
      customSystemPrompt: "Custom override",
    };
    const p = mergePluginWithUserState(basePlugin, userPlugin);
    const result = buildPluginsSystemPrompt([p]);
    expect(result).toContain("Custom override");
    expect(result).not.toContain("You are a CS assistant.");
  });

  // S-04: multiple plugins
  it("includes all plugins when multiple provided", () => {
    const p1 = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const p2 = mergePluginWithUserState(
      {
        ...basePlugin,
        id: "p2",
        name: "Sales",
        systemPromptAddition: "You are a sales expert.",
      },
      baseUserPlugin,
    );
    const result = buildPluginsSystemPrompt([p1, p2]);
    expect(result).toContain('<plugin name="Customer Success">');
    expect(result).toContain('<plugin name="Sales">');
  });
});

// SL-01: found command
describe("findCommandBySlug", () => {
  it("returns command when slug matches", () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const result = findCommandBySlug("qbr-prep", [p]);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("QBR Prep");
  });

  // SL-02: returns prompt for pre-fill
  it("returns correct prompt for matching slug", () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const result = findCommandBySlug("qbr-prep", [p]);
    expect(result?.prompt).toBe("Help me prep a QBR");
  });

  // SL-03: no match
  it("returns null when no command matches slug", () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    expect(findCommandBySlug("nonexistent", [p])).toBeNull();
  });

  it("returns null for empty plugins array", () => {
    expect(findCommandBySlug("qbr-prep", [])).toBeNull();
  });
});
