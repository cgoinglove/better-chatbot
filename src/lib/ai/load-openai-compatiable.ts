// openai-like.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { LanguageModel } from "ai";
import { OpenAICompatibleProvidersListSchema } from "./open-ai-like-schema";

/**
 * Loads dynamic, OpenAI-compatible models from an environment variable.
 * @returns An object containing the loaded models and a set of models
 *          that do not support tool calls.
 */
function loadDynamicModels() {
  const dynamicModels: Record<string, Record<string, LanguageModel>> = {};
  const dynamicUnsupportedModels = new Set<LanguageModel>();

  if (!process.env.OPENAI_LIKE_DATA) {
    console.log("No OPENAI_LIKE_DATA found, skipping dynamic model loading.");
    return { dynamicModels, dynamicUnsupportedModels };
  }

  try {
    const configData = JSON.parse(process.env.OPENAI_LIKE_DATA);
    const providers = OpenAICompatibleProvidersListSchema.parse(configData);

    providers.forEach(({ provider, models, baseUrl, apiKeyEnvVar }) => {
      const providerKey = provider.toLowerCase();

      const customProvider = createOpenAICompatible({
        name: provider,
        apiKey: process.env[apiKeyEnvVar],
        baseURL: baseUrl!,
      });

      dynamicModels[providerKey] = {};

      models.forEach(({ apiName, uiName, supportsTools }) => {
        const model = customProvider(apiName);
        dynamicModels[providerKey][uiName] = model;

        if (!supportsTools) {
          dynamicUnsupportedModels.add(model);
        }
      });
    });
  } catch (error) {
    console.error("Failed to load or parse dynamic models:", error);
  }

  return { dynamicModels, dynamicUnsupportedModels };
}

// Immediately load the models and export the results
export const { dynamicModels, dynamicUnsupportedModels } = loadDynamicModels();
