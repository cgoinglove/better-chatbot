import type { NextConfig } from "next";
export default () => {
  const nextConfig: NextConfig = {
    cleanDistDir: true,
    devIndicators: {
      position: "bottom-right",
    },
    experimental: {
      useCache: true,
    },
    images: {
      domains: ["avatar.vercel.sh"],
    },
    env: {
      NO_HTTPS: process.env.NO_HTTPS,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    },
  };
  return nextConfig;
};
