import "server-only";

import { createOllama, OllamaProvider } from "ollama-ai-provider";
import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import { AnthropicProvider, createAnthropic } from "@ai-sdk/anthropic";
import { createXai, XaiProvider } from "@ai-sdk/xai";
import {
  createOpenRouter,
  OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import {
  createOpenAICompatible,
  OpenAICompatibleProvider,
} from "@ai-sdk/openai-compatible";
import { createAzure, AzureOpenAIProvider } from "@ai-sdk/azure";
import { LanguageModel } from "ai";
import { ChatModel } from "app-types/chat";
import {
  getAllProviderConfigs,
  getProviderConfig,
  isProviderConfigured,
} from "./config";
import type {
  ProviderConfig,
  OpenAIModel,
  GoogleModel,
  AnthropicModel,
  XAIModel,
  OpenRouterModel,
  OllamaModel,
  OpenAICompatibleModel,
  AzureOpenAIModel,
} from "@/types/models";
import defaultLogger from "logger";
import { colorize } from "consola/utils";

const logger = defaultLogger.withDefaults({
  message: colorize("green", "Models: "),
});

// Union type for all provider types
type AnyProvider =
  | OpenAIProvider
  | GoogleGenerativeAIProvider
  | AnthropicProvider
  | XaiProvider
  | OpenRouterProvider
  | OllamaProvider
  | OpenAICompatibleProvider
  | AzureOpenAIProvider;

// Union type for all model definition types
type AnyModelDef =
  | OpenAIModel
  | GoogleModel
  | AnthropicModel
  | XAIModel
  | OpenRouterModel
  | OllamaModel
  | OpenAICompatibleModel
  | AzureOpenAIModel;

// Union type for all model settings
type ModelSettings =
  | OpenAIModel["settings"]
  | GoogleModel["settings"]
  | AnthropicModel["settings"]
  | XAIModel["settings"]
  | OpenRouterModel["settings"]
  | OllamaModel["settings"]
  | OpenAICompatibleModel["settings"]
  | AzureOpenAIModel["settings"];

const providerCache = new Map<string, AnyProvider>();

// Type mapping for provider configs to their respective provider instances
type ProviderTypeMap = {
  openai: OpenAIProvider;
  google: GoogleGenerativeAIProvider;
  anthropic: AnthropicProvider;
  xai: XaiProvider;
  openrouter: OpenRouterProvider;
  ollama: OllamaProvider;
  "azure-openai": AzureOpenAIProvider;
  "openai-compatible": OpenAICompatibleProvider;
};

// Function overloads for type-safe provider creation
function createProviderInstance<T extends ProviderConfig["type"]>(
  config: ProviderConfig & { type: T },
): ProviderTypeMap[T];
function createProviderInstance(config: ProviderConfig): AnyProvider | null;
function createProviderInstance(config: ProviderConfig): AnyProvider | null {
  switch (config.type) {
    case "openai":
      return createOpenAI(config.providerSettings);

    case "google":
      return createGoogleGenerativeAI(config.providerSettings);

    case "anthropic":
      return createAnthropic(config.providerSettings);

    case "xai":
      return createXai(config.providerSettings);

    case "openrouter":
      return createOpenRouter(config.providerSettings);

    case "ollama":
      return createOllama(config.providerSettings);

    case "azure-openai":
      return createAzure(config.providerSettings);

    case "openai-compatible":
      return createOpenAICompatible(config.providerSettings);

    default: {
      const type = (config as { type?: string }).type;
      logger.error(`Unknown provider type: ${type}`);
      throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

function getProvider(config: ProviderConfig): AnyProvider | null {
  const cacheKey = config.id;

  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  const provider = createProviderInstance(config);
  if (provider) {
    providerCache.set(cacheKey, provider);
    logger.info(`✅ Created provider: ${config.id}`);
  }

  return provider;
}

function findModelConfig(
  providerId: string,
  modelName: string,
): {
  providerConfig: ProviderConfig;
  modelDef: AnyModelDef;
} | null {
  const providerConfig = getProviderConfig(providerId);
  if (!providerConfig) {
    return null;
  }

  const modelDef = providerConfig.models.find((m) => m.uiName === modelName);
  return modelDef ? { providerConfig, modelDef } : null;
}

function createModelInstance(
  provider: AnyProvider,
  providerConfig: ProviderConfig,
  modelDef: AnyModelDef,
): LanguageModel {
  switch (providerConfig.type) {
    case "azure-openai": {
      const azureProvider = provider as AzureOpenAIProvider;
      const azureModel = azureProvider(modelDef.apiName);
      return azureModel;
    }

    case "ollama": {
      const ollamaProvider = provider as OllamaProvider;
      return ollamaProvider(modelDef.apiName);
    }

    case "openai": {
      const openaiProvider = provider as OpenAIProvider;
      return openaiProvider(modelDef.apiName);
    }

    case "google": {
      const googleProvider = provider as GoogleGenerativeAIProvider;
      return googleProvider(modelDef.apiName);
    }

    case "anthropic": {
      const anthropicProvider = provider as AnthropicProvider;
      return anthropicProvider(modelDef.apiName);
    }

    case "xai": {
      const xaiProvider = provider as XaiProvider;
      return xaiProvider(modelDef.apiName);
    }

    case "openrouter": {
      const openrouterProvider = provider as OpenRouterProvider;
      return openrouterProvider(modelDef.apiName);
    }

    case "openai-compatible": {
      const compatibleProvider = provider as OpenAICompatibleProvider;
      return compatibleProvider(modelDef.apiName);
    }

    default: {
      // TypeScript exhaustiveness check - this should never happen
      const type = (providerConfig as { type?: string }).type;
      logger.error(`Unknown provider type: ${type}`);
      throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

function getModel(chatModel?: ChatModel): {
  model: LanguageModel;
  settings: ModelSettings;
  supportsTools: boolean;
} | null {
  // Fallback to first available model if none specified
  if (!chatModel) {
    const fallback = getFallbackModel();
    if (!fallback) {
      throw new Error(
        "No AI models are configured. Please set at least one provider API key and ensure models are defined in models.json.",
      );
    }
    return fallback;
  }

  const providerId = chatModel.provider;

  const modelConfig = findModelConfig(providerId, chatModel.model);
  if (!modelConfig) {
    logger.warn(`Model not found: ${providerId}/${chatModel.model}`);
    return getFallbackModel();
  }

  const { providerConfig, modelDef } = modelConfig;

  const provider = getProvider(providerConfig);
  if (!provider) {
    logger.warn(`Failed to create provider: ${providerId}`);
    return getFallbackModel();
  }

  try {
    const model = createModelInstance(provider, providerConfig, modelDef);
    const modelSettings = modelDef.settings || {};

    return {
      model,
      settings: modelSettings,
      supportsTools: modelDef.supportsTools ?? true,
    };
  } catch (error) {
    logger.error(
      `Failed to create model ${providerId}/${chatModel.model}:`,
      error,
    );
    return getFallbackModel();
  }
}

function getFallbackModel(): {
  model: LanguageModel;
  settings: ModelSettings;
  supportsTools: boolean;
} | null {
  const providers = getAllProviderConfigs();

  for (const providerConfig of providers) {
    if (!isProviderConfigured(providerConfig.id)) {
      continue;
    }

    for (const modelDef of providerConfig.models) {
      try {
        const provider = getProvider(providerConfig);
        if (!provider) continue;

        const model = createModelInstance(provider, providerConfig, modelDef);
        const modelSettings = modelDef.settings || {};

        logger.info(
          `Using fallback model: ${providerConfig.id}/${modelDef.uiName}`,
        );
        return {
          model,
          settings: modelSettings,
          supportsTools: modelDef.supportsTools ?? true,
        };
      } catch (error) {
        logger.warn(
          `Failed to create fallback model ${providerConfig.id}/${modelDef.uiName}:`,
          error,
        );
        continue;
      }
    }
  }

  return null;
}

function getModelsInfo() {
  const allProviders = getAllProviderConfigs();

  return allProviders
    .filter((config) => isProviderConfigured(config.id))
    .map((config) => {
      const displayProvider = config.id;

      return {
        provider: displayProvider,
        models: config.models.map((model) => ({
          name: model.uiName,
          supportsTools: model.supportsTools,
        })),
      };
    });
}

export const modelRegistry = {
  get modelsInfo() {
    return getModelsInfo();
  },
  getModel: (chatModel?: ChatModel) => {
    const result = getModel(chatModel);
    if (!result) {
      throw new Error("No models available");
    }
    return result;
  },
};
