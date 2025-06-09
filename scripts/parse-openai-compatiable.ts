import { data, ifParsed } from "../.openai-compatible-config";
import * as fs from "fs";
import * as path from "path";
if (!ifParsed) {
  throw new Error("Invalid OpenAI compatible provider list configuration.");
}

/**
 * Reads a .env file, modifies a specific key's value, and writes it back.
 *
 * @param {string} envFilePath - The absolute path to the .env file.
 * @param {string} keyToModify - The key of the variable to add or edit (e.g., 'DATA').
 * @param {string} newValue - The new value for the variable.
 * @returns {boolean} - True if successful, false otherwise.
 */
function updateEnvVariable(
  envFilePath: string,
  keyToModify: string,
  newValue: string,
): boolean {
  try {
    let envContent = "";
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, "utf8");
    }

    const envVars: { [key: string]: string } = {};
    const lines = envContent.split("\n");

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#") || trimmedLine === "") {
        return;
      }

      const parts = trimmedLine.split("=");
      if (parts.length >= 2) {
        const key = parts[0];
        const value = parts.slice(1).join("=");
        envVars[key] = value;
      }
    });

    envVars[keyToModify] = newValue;

    let newEnvContent = "";
    for (const key in envVars) {
      if (Object.prototype.hasOwnProperty.call(envVars, key)) {
        newEnvContent += `${key}=${envVars[key]}\n`;
      }
    }

    newEnvContent = newEnvContent.trim();

    fs.writeFileSync(envFilePath, newEnvContent, "utf8");
    console.log(
      `Successfully updated ${keyToModify} in ${envFilePath} to: ${newValue}`,
    );
    return true;
  } catch (error) {
    console.error(`Error updating .env file: ${error}`);
    return false;
  }
}

const cwd = process.cwd();
const envPath = path.join(cwd, ".env");

const success = updateEnvVariable(envPath, "OPENAI_LIKE_DATA", `${data}`);

if (success) {
  console.log("Operation completed. Check your .env file!");
} else {
  console.log("Operation failed.");
}
