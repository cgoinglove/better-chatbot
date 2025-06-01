export const IS_DEV = process.env.NODE_ENV !== "production";
export const IS_BROWSER = typeof window !== "undefined";

declare const EdgeRuntime: any;
export const IS_EDGE_RUNTIME = typeof EdgeRuntime !== "undefined";

export const PROMPT_PASTE_MAX_LENGTH = 1000;

export const IS_VERCEL_ENV = process.env.VERCEL === "1";
export const IS_DOCKER_ENV = process.env.DOCKER_BUILD === "1";

export const IS_MCP_SERVER_SSE_ONLY = IS_VERCEL_ENV;
export const FILE_BASED_MCP_CONFIG =
  process.env.FILE_BASED_MCP_CONFIG === "true";

export const COOKIE_KEY_SIDEBAR_STATE = "sidebar:state";
export const COOKIE_KEY_LOCALE = "i18n:locale";

export const BASE_THEMES = [
  "default",
  "zinc",
  "slate",
  "stone",
  "gray",
  "blue",
  "orange",
  "pink",
  "bubblegum-pop",
  "cyberpunk-neon",
  "retro-arcade",
  "tropical-paradise",
  "steampunk-cogs",
  "neon-synthwave",
  "pastel-kawaii",
  "space-odyssey",
  "vintage-vinyl",
  "misty-harbor",
  "zen-garden",
];

export const SUPPORTED_LOCALES = [
  {
    code: "en",
    name: "English 🇺🇸",
  },
  {
    code: "ko",
    name: "Korean 🇰🇷",
  },

  {
    code: "es",
    name: "Spanish 🇪🇸",
  },
  {
    code: "fr",
    name: "French 🇫🇷",
  },
  {
    code: "ja",
    name: "Japanese 🇯🇵",
  },
  {
    code: "zh",
    name: "Chinese 🇨🇳",
  },
];
