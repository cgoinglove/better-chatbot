import fs from "fs";
import path from "path";

// Get current directory path
const ROOT = process.cwd();

const DOCKER_ENV_PATH = path.join(ROOT, "docker");

// PostgreSQL settings for Docker environment
const DOCKER_POSTGRES_SETTINGS = [
  "# == DOCKER POSTGRES SETTINGS ==",
  "POSTGRES_URL=postgres://your_username:your_password@postgres:5432/better_chatbot",
  "POSTGRES_DB=better_chatbot",
  "POSTGRES_USER=your_username",
  "POSTGRES_PASSWORD=your_password",
].join("\n");

/**
 * Copy .env.example to .env if .env doesn't exist
 */
function copyEnvFile() {
  const envPath = path.join(ROOT, ".env");
  const envExamplePath = path.join(ROOT, ".env.example");

  if (!fs.existsSync(envPath)) {
    try {
      console.warn(".env file not found. Copying from .env.example...");
      fs.copyFileSync(envExamplePath, envPath);
      console.log(".env file has been created.");
      console.warn(
        "Important: You may need to edit the .env file to set your API keys.",
      );
    } catch (error) {
      console.error("Error occurred while creating .env file.");
      console.error(error);
      return false;
    }
  } else {
    console.info(".env file already exists. Skipping...");
  }

  if (!fs.existsSync(DOCKER_ENV_PATH + "/.env")) {
    try {
      // Copy .env.example content first
      const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");

      // Replace existing POSTGRES_URL with all Docker PostgreSQL settings
      const dockerEnvContent = envExampleContent.replace(
        /POSTGRES_URL=postgres:\/\/.*$/m,
        DOCKER_POSTGRES_SETTINGS,
      );

      fs.writeFileSync(DOCKER_ENV_PATH + "/.env", dockerEnvContent, "utf-8");
      console.log(
        "/docker/.env file has been created with PostgreSQL settings.",
      );
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
