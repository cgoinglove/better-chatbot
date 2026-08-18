import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

initOpenNextCloudflareForDev();

const BUILD_OUTPUT = process.env.NEXT_STANDALONE_OUTPUT
  ? "standalone"
  : undefined;

export default () => {
  const nextConfig: NextConfig = {
    output: BUILD_OUTPUT,
    outputFileTracingIncludes: {
      "/*": [
        "./node_modules/pg-cloudflare/dist/**/*",
        "./node_modules/pg-cloudflare/esm/**/*",
        "./node_modules/pg-cloudflare/package.json",
      ],
    },
    cleanDistDir: true,
    devIndicators: {
      position: "bottom-right",
    },
    env: {
      NO_HTTPS: process.env.NO_HTTPS,
      NEXT_PUBLIC_MCP_REMOTE_ONLY:
        process.env.MCP_REMOTE_ONLY ||
        (process.env.APP_RUNTIME === "cloudflare-workers" ? "1" : ""),
    },
    experimental: {
      taint: true,
      authInterrupts: true,
    },
  };
  const withNextIntl = createNextIntlPlugin();
  return withNextIntl(nextConfig);
};
