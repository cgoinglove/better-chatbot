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
 * Copy config/models.example.json to config/models.json if models.json doesn't exist
 */
function copyModelsConfigFile() {
  const modelsConfigPath = path.join(ROOT, "config/models.json");
  const modelsExamplePath = path.join(ROOT, "config/models.example.json");

  if (!fs.existsSync(modelsConfigPath)) {
    try {
      console.warn(
        "config/models.json file not found. Copying from config/models.example.json...",
      );

      // Ensure config directory exists
      const configDir = path.join(ROOT, "config");
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log("Created config directory.");
      }

      fs.copyFileSync(modelsExamplePath, modelsConfigPath);
      console.log("config/models.json file has been created.");
      console.warn(
        "Important: You may need to edit the config/models.json file to configure your AI providers.",
      );
    } catch (error) {
      console.error("Error occurred while creating config/models.json file.");
      console.error(error);
      return false;
    }
  } else {
    console.info("config/models.json file already exists. Skipping...");
  }

  return true;
}

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

// Execute copy operations
const envResult = copyEnvFile();
const modelsResult = copyModelsConfigFile();

const success = envResult && modelsResult;
process.exit(success ? 0 : 1);
