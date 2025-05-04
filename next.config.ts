import type { NextConfig } from "next";

export default (phase: string) => {
  if (phase?.endsWith("-build")) {
    process.env.MCP_NO_INITIAL = "true";
  }
  const nextConfig: NextConfig = {
    serverExternalPackages: ["@libsql/client"],
    cleanDistDir: true,
    devIndicators: {
      position: "bottom-right",
    },
    /* config options here */
  };
  return nextConfig;
};
