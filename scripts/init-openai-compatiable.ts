import path from "path";
import * as fs from "fs";

const CONFIG_TEMPLATE = `
import { type OpenAICompatibleProvider } from "./src/lib/ai/create-openai-compatiable";

const providers: OpenAICompatibleProvider[] = [
  // example
  // {
  //   provider: "Groq",
  //   apiKey: "123",
  //   baseUrl: "https://api.groq.com/openai/v1",
  //   models: [
  //     {
  //       apiName: "llama3-8b-8192",
  //       uiName: "Llama 3 8B",
  //       supportsTools: true,
  //     },
  //     {
  //       apiName: "mixtral-8x7b-32768",
  //       uiName: "Mixtral 8x7B",
  //       supportsTools: true,
  //     },
  //     {
  //       apiName: "gemma-7b-it",
  //       uiName: "Gemma 7B IT",
  //       supportsTools: false,
  //     },
  //   ],
  // },

  // Example configuration for Azure OpenAI
  // {
  //   provider: "Azure OpenAI",
  //   apiKey: "YOUR_AZURE_OPENAI_API_KEY",
  //   baseUrl: "https://your-azure-resource.openai.azure.com/openai/deployments/",
  //   models: [
  //     {
  //       apiName: "your-deployment-name",
  //       uiName: "GPT-4o (Azure Example)",
  //       supportsTools: true,
  //       apiVersion: "2025-01-01-preview",
  //     },
  //   ],
  // },
];

export default providers;

`.trim();

const ROOT = process.cwd();
const FILE_NAME = "openai-compatible.config.ts";
const CONFIG_PATH = path.join(ROOT, FILE_NAME);

function createConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    try {
      fs.writeFileSync(CONFIG_PATH, CONFIG_TEMPLATE, "utf-8");
      console.log(`${FILE_NAME} file has been created.`);
    } catch (error) {
      console.error(`Error occurred while creating ${FILE_NAME} file.`);
      console.error(error);
      return false;
    }
  } else {
    console.info(`${FILE_NAME} file already exists. Skipping...`);
  }
}

createConfigFile();
