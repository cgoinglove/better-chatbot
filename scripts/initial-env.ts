import fs from "fs";
import path from "path";

// Get current directory path
const ROOT = process.cwd();

const DOCKER_ENV_PATH = path.join(ROOT, "docker", ".env.docker");

const DOCKER_ENV_CONTENT =
  [
    "POSTGRES_URL=postgres://your_username:your_password@postgres:5433/your_database_name",
    "POSTGRES_DB=your_database_name",
    "POSTGRES_USER=your_username",
    "POSTGRES_PASSWORD=your_password",
  ].join("\n") + "\n";

const ENV_EXAMPLE_CONTENT = `# === LLM Provider API Keys ===
# You only need to enter the keys for the providers you plan to use
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=
XAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/api

# Secret for Better Auth (generate with: npx @better-auth/cli@latest secret)
BETTER_AUTH_SECRET=

# (Optional)
# URL for Better Auth (the URL you access the app from)
BETTER_AUTH_URL=

# === Database ===
# If you don't have PostgreSQL running locally, start it with: pnpm docker:pg
POSTGRES_URL=postgres://your_username:your_password@localhost:5432/your_database_name

# Whether to use file-based MCP config (default: false)
FILE_BASED_MCP_CONFIG=false

# (Optional)
# === OAuth Settings ===
# Fill in these values only if you want to enable social login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# === Okta OAuth Settings ===
# Fill in these values to enable Okta authentication
OKTA_DOMAIN=
OKTA_CLIENT_ID=
OKTA_CLIENT_SECRET=

# Whether to disable user registration (default: false)
DISABLE_SIGN_UP=false

# Optional: Set to '1' to disable HTTPS in local development
NO_HTTPS=
`;

/**
 * Copy .env.example to .env if .env doesn't exist
 */
function copyEnvFile() {
  const envPath = path.join(ROOT, ".env");
  const envExamplePath = path.join(ROOT, ".env.example");

  // Create .env.example if it doesn't exist
  if (!fs.existsSync(envExamplePath)) {
    try {
      fs.writeFileSync(envExamplePath, ENV_EXAMPLE_CONTENT, "utf-8");
      console.log(".env.example file has been created.");
    } catch (error) {
      console.error("Error occurred while creating .env.example file.");
      console.error(error);
      return false;
    }
  }

  if (!fs.existsSync(envPath)) {
    try {
      console.warn(".env file not found. Copying from .env.example...");
      fs.copyFileSync(envExamplePath, envPath);
      console.log(".env file has been created.");
      console.warn(
        "Important: You may need to edit the .env file to set your API keys and OAuth credentials.",
      );
    } catch (error) {
      console.error("Error occurred while creating .env file.");
      console.error(error);
      return false;
    }
  } else {
    console.info(".env file already exists. Skipping...");
  }

  if (!fs.existsSync(DOCKER_ENV_PATH)) {
    try {
      fs.writeFileSync(DOCKER_ENV_PATH, DOCKER_ENV_CONTENT, "utf-8");
      console.log("/docker/.env file has been created.");
    } catch (error) {
      console.error("Error occurred while creating /docker/.env file.");
      console.error(error);
      return false;
    }
  } else {
    console.info("/docker/.env file already exists. Skipping...");
  }

  return true;
}

// Execute copy operation
const result = copyEnvFile();
process.exit(result ? 0 : 1);
