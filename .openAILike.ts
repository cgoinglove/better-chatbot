import {
  ProvidersListSchema,
  type BaseProvidersList,
} from "./src/lib/ai/open-ai-like-schema";
const providerList: BaseProvidersList = [
  {
    provider: "Groq",
    apiKeyEnvVar: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      {
        apiName: "llama3-8b-8192",
        uiName: "Llama 3 8B",
        supportsTools: true,
      },
      {
        apiName: "mixtral-8x7b-32768",
        uiName: "Mixtral 8x7B",
        supportsTools: true,
      },
      {
        apiName: "gemma-7b-it",
        uiName: "Gemma 7B IT",
        supportsTools: true,
      },
    ],
  },
];

export const ifParsed = ProvidersListSchema.parse(providerList);
export const data = JSON.stringify(providerList);
