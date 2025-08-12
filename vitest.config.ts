import { defineConfig } from "vitest/config";

import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    alias: {
      "server-only": new URL("./mocks/server-only.js", import.meta.url)
        .pathname,
    },
  },
});
