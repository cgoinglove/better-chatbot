import { AppDefaultToolkit, DefaultToolName } from "lib/ai/tools";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { loadAppDefaultTools } = await import("./tool-loading");

const CODE_TOOLS = [
  DefaultToolName.PythonExecution,
  DefaultToolName.E2BSandbox,
  DefaultToolName.JavascriptExecution,
];

const load = (opt?: Parameters<typeof loadAppDefaultTools>[0]) =>
  Object.keys(loadAppDefaultTools(opt));

describe("loadAppDefaultTools", () => {
  it("resolves from the toolkits when there are no mentions", () => {
    const names = load({ allowedAppDefaultToolkit: [AppDefaultToolkit.Code] });
    for (const tool of CODE_TOOLS) expect(names).toContain(tool);
  });

  it("keeps the code tools when only an agent mention is present", () => {
    // Selecting an agent injects a {type:"agent"} mention. That alone used to
    // drop every app default tool, so an agent turn silently lost
    // python-execution and e2b-sandbox while all Composio tools stayed bound.
    const names = load({
      allowedAppDefaultToolkit: [AppDefaultToolkit.Code],
      mentions: [
        { type: "agent", agentId: "a1", name: "Research", icon: undefined },
      ] as never,
    });

    for (const tool of CODE_TOOLS) expect(names).toContain(tool);
  });

  it("pins a mentioned tool and still keeps code execution available", () => {
    const names = load({
      allowedAppDefaultToolkit: [
        AppDefaultToolkit.Code,
        AppDefaultToolkit.WebSearch,
      ],
      mentions: [
        {
          type: "defaultTool",
          name: DefaultToolName.WebSearch,
          label: DefaultToolName.WebSearch,
        },
      ] as never,
    });

    // The pin is honoured...
    expect(names).toContain(DefaultToolName.WebSearch);
    // ...and an agent that pins a table builder can still compute what goes
    // in the table.
    for (const tool of CODE_TOOLS) expect(names).toContain(tool);
  });

  it("does not resurrect code tools the user switched off", () => {
    // The fix must widen availability, never override an explicit opt-out.
    const names = load({
      allowedAppDefaultToolkit: [AppDefaultToolkit.WebSearch],
      mentions: [
        {
          type: "defaultTool",
          name: DefaultToolName.WebSearch,
          label: DefaultToolName.WebSearch,
        },
      ] as never,
    });

    for (const tool of CODE_TOOLS) expect(names).not.toContain(tool);
  });

  it("keeps code tools off for an agent turn when Code is disabled", () => {
    const names = load({
      allowedAppDefaultToolkit: [AppDefaultToolkit.WebSearch],
      mentions: [
        { type: "agent", agentId: "a1", name: "Research", icon: undefined },
      ] as never,
    });

    for (const tool of CODE_TOOLS) expect(names).not.toContain(tool);
    expect(names).toContain(DefaultToolName.WebSearch);
  });
});
