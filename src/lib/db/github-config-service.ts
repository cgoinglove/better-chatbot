import crypto from "crypto";
import logger from "logger";
import { pgGithubConfigService } from "./queries.pg/github-config";
import { sqliteGithubConfigService } from "./queries.sqlite/github-config";

// Function to ensure the GitHub config table exists
export const ensureGithubConfigTable = async () => {
  // We'll use the migration system instead of manually creating tables
  // This function is kept as a placeholder for future use if needed
  logger.info("Using migrations for GitHub config table");
};

// Call this function to ensure the table exists
ensureGithubConfigTable().catch((err) => {
  logger.error("Error ensuring GitHub config table exists:", err);
});

// Generate a random webhook secret
export const generateWebhookSecret = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const githubConfigService =
  process.env.USE_FILE_SYSTEM_DB === "true"
    ? sqliteGithubConfigService
    : pgGithubConfigService;
