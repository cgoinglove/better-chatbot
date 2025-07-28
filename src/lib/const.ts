export const IS_DEV = process.env.NODE_ENV !== "production";
export const IS_BROWSER = typeof window !== "undefined";

declare const EdgeRuntime: any;
export const IS_EDGE_RUNTIME = typeof EdgeRuntime !== "undefined";

export const PROMPT_PASTE_MAX_LENGTH = 1000;

export const IS_VERCEL_ENV = process.env.VERCEL === "1";
export const IS_DOCKER_ENV = process.env.DOCKER_BUILD === "1";

export const IS_MCP_SERVER_REMOTE_ONLY = IS_VERCEL_ENV;
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

export const BACKGROUND_COLORS = [
  "oklch(87% 0 0)",
  "oklch(20.5% 0 0)",
  "oklch(80.8% 0.114 19.571)",
  "oklch(83.7% 0.128 66.29)",
  "oklch(84.5% 0.143 164.978)",
  "oklch(82.8% 0.111 230.318)",
  "oklch(78.5% 0.115 274.713)",
  "oklch(81% 0.117 11.638)",
  "oklch(81% 0.117 11.638)",
];

export const EMOJI_DATA = [
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f604.png",
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f603.png",
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f602.png",
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f601.png",
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f600.png",
];
