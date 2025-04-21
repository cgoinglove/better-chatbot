import type { NextConfig } from "next";
import { publicRuntimeConfig, serverRuntimeConfig } from "./src/lib/next-env";

export default (phase: string, { defaultConfig }) => {
  if (phase?.endsWith("-build")) {
    process.env.MCP_NO_INITIAL = "true";
  }

  // Load environment variables from .env file
  require("dotenv").config();

  const nextConfig: NextConfig = {
    serverExternalPackages: ["@libsql/client"],
    env: {
      // Expose these environment variables to the browser
      NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV || "development",
    },
    serverRuntimeConfig, // Will only be available on the server side
    publicRuntimeConfig, // Will be available on both server and client sides
  };

  return nextConfig;
};
