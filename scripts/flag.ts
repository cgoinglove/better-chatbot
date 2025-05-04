import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import logger from "logger";
import { colorize } from "consola/utils";

export const FLAG_VERSION = "1.0.0";

const CACHE_PATH = join(process.cwd(), "node_modules/.mcp-chatbot-cache");

const flagPath = join(CACHE_PATH, FLAG_VERSION);

const flagCheck = () => {
  if (existsSync(flagPath)) {
    return true;
  }
  return false;
};

const flagGenerate = () => {
  if (!existsSync(flagPath)) {
    mkdirSync(flagPath, { recursive: true });
  }
};

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === "generate") {
  flagGenerate();
} else {
  if (!flagCheck()) {
    logger.error(
      `${colorize("cyan", "🔄 UPDATE REQUIRED")} - ${colorize("yellow", `Version ${FLAG_VERSION}`)}:\n\n👇🏻 Please run the following commands for proper operation:\n\n${colorize("green", "pnpm initial")}`,
    );
    process.exit(1);
  }
}
