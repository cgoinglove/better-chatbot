import { describe, expect, test } from "vitest";
import {
  ENABLED_PREVIEW_TEMPLATE_IDS,
  describeEnabledPreviewEntrypoints,
  describeEnabledPreviewPorts,
  describeEnabledPreviewTemplates,
  getEnabledPreviewTemplate,
  getSandboxTemplate,
} from "./sandbox-registry";

describe("sandbox template registry", () => {
  test("only production-enabled preview templates are exposed", () => {
    expect(ENABLED_PREVIEW_TEMPLATE_IDS).toEqual([
      "nextjs-developer",
      "vue-developer",
      "streamlit-developer",
      "gradio-developer",
    ]);
  });

  test("rejects the execution-only interpreter as a preview", () => {
    expect(getSandboxTemplate("code-interpreter-v1")?.kind).toBe("execution");
    expect(getEnabledPreviewTemplate("code-interpreter-v1")).toBeUndefined();
  });

  test("keeps the custom template disabled for data-only rollback", () => {
    expect(getSandboxTemplate("navigator-remotion-nextjs")?.enabled).toBe(
      false,
    );
    expect(
      getEnabledPreviewTemplate("navigator-remotion-nextjs"),
    ).toBeUndefined();
  });
});

describe("script-side template list", () => {
  // scripts/e2b/*.mjs are plain ESM and cannot import this TypeScript module,
  // so they keep their own copy of the ids. A silent divergence would mean
  // `pnpm e2b:diagnose` reports a clean bill of health for templates the app
  // actually asks for — the exact gap those scripts exist to close.
  test("matches the enabled preview templates in the registry", async () => {
    const { COMMUNITY_PREVIEW_TEMPLATES, CUSTOM_TEMPLATES } = await import(
      "../../../../../scripts/e2b/template.mjs"
    );

    const scriptSide = [
      ...COMMUNITY_PREVIEW_TEMPLATES.map((t: { name: string }) => t.name),
      ...CUSTOM_TEMPLATES.map((t: { name: string }) => t.name),
    ];

    // Every template the app can request must be known to the scripts.
    for (const id of ENABLED_PREVIEW_TEMPLATE_IDS) {
      expect(scriptSide).toContain(id);
    }
    // And every custom template the scripts build must be in the registry,
    // enabled or not — otherwise we ship an image nothing can select.
    for (const custom of CUSTOM_TEMPLATES as Array<{ name: string }>) {
      expect(getSandboxTemplate(custom.name)).toBeDefined();
    }
  });
});

describe("generated tool guidance", () => {
  // The tool used to carry this per-template guidance as hand-written prose, so
  // adding a registry entry made it selectable by the model while telling it
  // nothing about which file to write or which port to use.
  test("covers every enabled template with an entrypoint and port", () => {
    const described = describeEnabledPreviewTemplates();
    for (const id of ENABLED_PREVIEW_TEMPLATE_IDS) {
      const definition = getSandboxTemplate(id)!;
      expect(described).toContain(id);
      expect(described).toContain(definition.entrypoint);
    }
    expect(describeEnabledPreviewPorts()).toContain("streamlit-developer=8501");
    expect(describeEnabledPreviewEntrypoints()).toContain(
      "vue-developer → app/app.vue",
    );
  });

  test("omits templates that are disabled", () => {
    expect(describeEnabledPreviewTemplates()).not.toContain(
      "navigator-remotion-nextjs",
    );
  });
});
