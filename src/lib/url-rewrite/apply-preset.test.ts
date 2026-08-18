import { describe, expect, it } from "vitest";
import { buildPresetStatePatch } from "./apply-preset";
import { AppDefaultToolkit } from "lib/ai/tools";

const THREAD_ID = "thread-1";

describe("buildPresetStatePatch", () => {
  it("leaves out every key the link does not set", () => {
    expect(buildPresetStatePatch({}, THREAD_ID)).toEqual({});
  });

  it("applies an explicit override even when it is empty", () => {
    const patch = buildPresetStatePatch(
      { allowedAppDefaultToolkit: [], allowedMcpServers: {} },
      THREAD_ID,
    );

    expect(patch).toEqual({
      allowedAppDefaultToolkit: [],
      allowedMcpServers: {},
    });
  });

  it("distinguishes an empty override from an unset key", () => {
    const keep = buildPresetStatePatch({}, THREAD_ID);
    const override = buildPresetStatePatch(
      { allowedAppDefaultToolkit: [] },
      THREAD_ID,
    );

    expect("allowedAppDefaultToolkit" in keep).toBe(false);
    expect("allowedAppDefaultToolkit" in override).toBe(true);
  });

  it("drops toolkits the app no longer knows about", () => {
    const patch = buildPresetStatePatch(
      { allowedAppDefaultToolkit: [AppDefaultToolkit.Code, "retired-toolkit"] },
      THREAD_ID,
    );

    expect(patch.allowedAppDefaultToolkit).toEqual([AppDefaultToolkit.Code]);
  });

  it("scopes mentions to the thread without losing the other threads", () => {
    const patch = buildPresetStatePatch(
      {
        mentions: [{ type: "agent", name: "Researcher", agentId: "agent-1" }],
      },
      THREAD_ID,
      {
        "other-thread": [{ type: "defaultTool", name: "http", label: "HTTP" }],
      },
    );

    expect(patch.threadMentions).toEqual({
      "other-thread": [{ type: "defaultTool", name: "http", label: "HTTP" }],
      [THREAD_ID]: [{ type: "agent", name: "Researcher", agentId: "agent-1" }],
    });
  });

  it("keeps the model and tool mode when the link sets them", () => {
    const patch = buildPresetStatePatch(
      {
        chatModel: { provider: "openai", model: "gpt-4.1" },
        toolChoice: "manual",
      },
      THREAD_ID,
    );

    expect(patch.chatModel).toEqual({ provider: "openai", model: "gpt-4.1" });
    expect(patch.toolChoice).toBe("manual");
  });
});
