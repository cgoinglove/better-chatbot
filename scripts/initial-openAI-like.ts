import path from "path";
import * as fs from "fs";
const CONFIG_TEMPLATE = `
// don't edit this part
import {
  ProvidersListSchema,
  type BaseProvidersList,
} from "./src/lib/ai/open-ai-like-schema";
// edit this part
const providerList: BaseProvidersList = [
  // example {
  //   provider: "Groq",
  //   apiKeyEnvVar: "GROQ_API_KEY",
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
];

export const ifParsed = ProvidersListSchema.parse(providerList);
export const data = JSON.stringify(providerList);
`;

const ROOT = process.cwd();

const CONFIG_PATH = path.join(ROOT,  ".openAILike.ts");
function createConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    try {
      fs.writeFileSync(CONFIG_PATH, CONFIG_TEMPLATE, "utf-8");
      console.log(".openAILike.ts file has been created.");
    } catch (error) {
      console.error("Error occurred while creating .openAILike.ts file.");
      console.error(error);
      return false;
    }
  } else {
    console.info(".openAILike.ts file already exists. Skipping...");
  }
}
createConfigFile();