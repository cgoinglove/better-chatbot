/**
 * Custom E2B templates built by this repo.
 *
 * This was a set of single scalars, and the build command in package.json
 * re-typed every value by hand — so the two could silently drift, and there was
 * no way to express a second template at all. Everything is now driven from
 * this list: add an entry, and build/diagnose/smoke all pick it up.
 *
 * `name` must exactly match the key in
 * apps/web/src/lib/e2b/sandbox-registry.ts — the registry key is passed
 * verbatim to Sandbox.create, so a mismatch surfaces at runtime as a 502
 * template_not_available rather than at build time.
 *
 * Community templates (nextjs-developer, vue-developer, streamlit-developer,
 * gradio-developer, code-interpreter-v1) are NOT listed here: they are not
 * built by this repo and must already exist in the E2B account.
 */
export const CUSTOM_TEMPLATES = [
  {
    name: "navigator-remotion-nextjs",
    dockerfile: "./e2b.Dockerfile",
    // Note the `cd`: this image puts the app at /home/user/app, while the
    // sandbox default CWD is /home/user. Relative files.write() calls from the
    // app land in the default CWD, so a template whose app root is not the
    // default CWD will not see generated files. Prefer /home/user for new
    // templates.
    startCommand: "cd /home/user/app && npm run dev",
    readyCommand: "curl --fail --silent --show-error http://localhost:3000",
    port: 3000,
    entrypoint: "pages/index.tsx",
    packages: [
      "next@16.2.12",
      "react@19.2.8",
      "react-dom@19.2.8",
      "remotion@4.0.500",
      "@remotion/player@4.0.500",
    ],
  },
  {
    name: "navigator-html-render",
    dockerfile: "./e2b.render.Dockerfile",
    // No dev server — this template is driven through the SDK, so the start
    // command just has to keep the sandbox alive.
    startCommand: "sleep infinity",
    readyCommand: 'python -c "import weasyprint"',
    port: null,
    entrypoint: "render.py",
    packages: ["weasyprint==63.1", "pypdf==5.1.0"],
  },
];

/**
 * Preview templates that must exist in the E2B account but are not built here.
 *
 * The scripts are plain ESM and cannot import the TypeScript registry, so this
 * is the script-side copy. `sandbox-registry.test.ts` asserts the two agree, so
 * drift fails the test suite rather than surfacing as a 502 in production.
 */
export const COMMUNITY_PREVIEW_TEMPLATES = [
  { name: "nextjs-developer", port: 3000, entrypoint: "pages/index.tsx" },
  { name: "vue-developer", port: 3000, entrypoint: "app/app.vue" },
  { name: "streamlit-developer", port: 8501, entrypoint: "app.py" },
  { name: "gradio-developer", port: 7860, entrypoint: "app.py" },
];

/** Every template the app may ask for — community previews plus everything built here. */
export const ALL_TEMPLATE_NAMES = [
  ...COMMUNITY_PREVIEW_TEMPLATES.map((template) => template.name),
  ...CUSTOM_TEMPLATES.map((template) => template.name),
];

export function buildCommandFor(template) {
  return [
    "e2b template build",
    `--name ${template.name}`,
    `--dockerfile ${template.dockerfile}`,
    `--cmd ${JSON.stringify(template.startCommand)}`,
    `--ready-cmd ${JSON.stringify(template.readyCommand)}`,
  ].join(" ");
}

export function getCustomTemplate(name) {
  return CUSTOM_TEMPLATES.find((template) => template.name === name);
}

if (process.argv[1]?.endsWith("template.mjs")) {
  const [, , command, name] = process.argv;

  // `build <name>` prints just the CLI invocation so package.json can exec it
  // instead of duplicating the flags.
  if (command === "build") {
    const target = name ? getCustomTemplate(name) : CUSTOM_TEMPLATES[0];
    if (!target) {
      console.error(
        `Unknown template "${name}". Known: ${CUSTOM_TEMPLATES.map((t) => t.name).join(", ")}`,
      );
      process.exit(1);
    }
    console.log(buildCommandFor(target));
  } else {
    console.log(
      JSON.stringify(
        CUSTOM_TEMPLATES.map((template) => ({
          ...template,
          buildCommand: buildCommandFor(template),
        })),
        null,
        2,
      ),
    );
  }
}
