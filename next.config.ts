import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { ifParsed, data as openAIProviderData } from "./.openAILike";
import logger from "lib/logger";
import { IS_VERCEL_ENV } from "lib/const";

if (!ifParsed && !IS_VERCEL_ENV) {
  logger.error(
    "Error: openAILike data not parsed and weare not on Vercel. Exiting. Try refactoring the config or remaking it.",
  );
  process.exit(1);
}

export default () => {
  const nextConfig: NextConfig = {
    cleanDistDir: true,
    devIndicators: {
      position: "bottom-right",
    },
    env: {
      NO_HTTPS: process.env.NO_HTTPS,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      ...(ifParsed && !IS_VERCEL_ENV
        ? { OPENAI_LIKE_DATA: openAIProviderData }
        : {}),
    },
  };
  const withNextIntl = createNextIntlPlugin();
  return withNextIntl(nextConfig);
};
