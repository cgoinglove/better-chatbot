/**
 * Custom LLM Providers Support
 * 
 * This file enables integration with OpenAI-compatible API providers without code changes.
 * Providers are configured through environment variables:
 * 
 * 1. Define providers in CUSTOM_PROVIDERS:
 *    CUSTOM_PROVIDERS=openrouter:https://openrouter.ai/api/v1:OPENROUTER_API_KEY
 * 
 * 2. Set API keys:
 *    OPENROUTER_API_KEY=your_api_key_here
 * 
 * 3. Configure models:
 *    CUSTOM_PROVIDER_MODELS_openrouter=claude-3-opus:anthropic/claude-3-opus
 * 
 * The app loads these configurations dynamically at runtime.
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { LanguageModel } from "ai";

/**
 * Interface for custom provider configuration
 */
interface CustomProviderConfig {
  name: string;
  baseURL: string;
  apiKeyEnvVar: string;
  headers?: Record<string, string>;
}

/**
 * Parse custom providers from environment variables
 *
 * Format: provider_name:base_url:api_key_env_var,...
 *
 * @returns Array of custom provider configurations
 */
export const parseCustomProviders = (): CustomProviderConfig[] => {
  const customProvidersStr = process.env.CUSTOM_PROVIDERS || "";

  // Start with an empty array of providers
  let providers: CustomProviderConfig[] = [];

  // Add OpenRouter as a custom provider if API key is set
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKeyEnvVar: "OPENROUTER_API_KEY",
      headers: {
        "HTTP-Referer": process.env.SITE_URL || "",
        "X-Title": process.env.SITE_NAME || "MCP Client Chatbot",
      },
    });
  }

  // Parse custom providers from CUSTOM_PROVIDERS env var
  if (customProvidersStr) {
    const parsedProviders = customProvidersStr
      .split(",")
      .map((providerStr) => {
        const [name, baseURL, apiKeyEnvVar] = providerStr.split(":");
        if (!name || !baseURL || !apiKeyEnvVar) return null;

        return {
          name: name.trim(),
          baseURL: baseURL.trim(),
          apiKeyEnvVar: apiKeyEnvVar.trim(),
        };
      })
      .filter((config): config is CustomProviderConfig => config !== null);

    // Add the parsed providers to the array
    providers = [...providers, ...parsedProviders];
  }

  return providers;
};

/**
 * Get models for a provider from environment variables
 *
 * Models are configured using CUSTOM_PROVIDER_MODELS_* environment variables
 *
 * @param providerName - Name of the provider
 * @returns Record of display name to model ID mappings
 */
export const getModelsForProviderName = (
  providerName: string,
): Record<string, string> => {
  const result: Record<string, string> = {};

  // Check for models defined in CUSTOM_PROVIDER_MODELS_* environment variable
  const envVarName = `CUSTOM_PROVIDER_MODELS_${providerName}`;
  const customModelsStr = process.env[envVarName] || "";

  if (customModelsStr) {
    customModelsStr.split(",").forEach((modelStr) => {
      const [displayName, modelId] = modelStr.split(":");
      if (displayName && modelId) {
        result[displayName.trim()] = modelId.trim();
      }
    });
  }

  return result;
};

/**
 * Create a provider instance for an OpenAI-compatible API endpoint
 *
 * @param config - Provider configuration
 * @returns Provider instance
 */
export const createProviderFromConfig = (config: CustomProviderConfig) => {
  const apiKey = process.env[config.apiKeyEnvVar] || "";

  return createOpenAICompatible({
    name: config.name,
    baseURL: config.baseURL,
    apiKey: apiKey,
    headers: config.headers,
  });
};

/**
 * Get models for a custom provider
 *
 * @param config - Provider configuration
 * @returns Record of model name to language model instance
 */
export const getModelsForProvider = (
  config: CustomProviderConfig,
): Record<string, LanguageModel> => {
  const provider = createProviderFromConfig(config);
  const modelDefinitions = getModelsForProviderName(config.name);

  // Create empty result if no models are configured
  if (Object.keys(modelDefinitions).length === 0) {
    return {};
  }

  // Create model instances for each model definition
  const models: Record<string, LanguageModel> = {};

  for (const [displayName, modelId] of Object.entries(modelDefinitions)) {
    models[displayName] = provider.chatModel(modelId);
  }

  return models;
};

/**
 * Get all custom provider models
 *
 * @returns Record of provider name to models record
 */
export const getAllCustomProviderModels = (): Record<
  string,
  Record<string, LanguageModel>
> => {
  const providers = parseCustomProviders();

  // Filter out providers with no models
  return Object.fromEntries(
    providers
      .map((provider) => [provider.name, getModelsForProvider(provider)])
      .filter(([_, models]) => Object.keys(models).length > 0),
  );
};