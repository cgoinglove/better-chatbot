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

import { getSession } from "auth/server";
import { parseEnvBoolean } from "lib/utils";

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
  userIdentifier?: string,
): ProviderTypeMap[T];
function createProviderInstance(
  config: ProviderConfig,
  userIdentifier?: string,
): AnyProvider | null;
function createProviderInstance(
  config: ProviderConfig,
  userIdentifier?: string,
): AnyProvider | null {
  const userHeaderKey = process.env.API_USER_HEADER_KEY || "x-user-id";

  const userHeaders: {
    headers: Record<string, string>;
  } = {
    headers: {},
  };
  if (userIdentifier) {
    userHeaders.headers[userHeaderKey] = userIdentifier;
  }

  switch (config.type) {
    case "openai":
      return createOpenAI({
        ...config.providerSettings,

        ...userHeaders,
      });

    case "google":
      return createGoogleGenerativeAI({
        ...config.providerSettings,
        ...userHeaders,
      });

    case "anthropic":
      return createAnthropic({
        ...config.providerSettings,
        ...userHeaders,
      });

    case "xai":
      return createXai({
        ...config.providerSettings,
        ...userHeaders,
      });

    case "openrouter":
      return createOpenRouter({
        ...config.providerSettings,
        ...userHeaders,
      });

    case "ollama":
      return createOllama({
        ...config.providerSettings,
        ...userHeaders,
      });

    case "azure-openai":
      return createAzure({
        ...config.providerSettings,
        ...userHeaders,
      });

    case "openai-compatible":
      return createOpenAICompatible({
        ...config.providerSettings,
        ...userHeaders,
      });

    default: {
      const type = (config as { type?: string }).type;
      logger.error(`Unknown provider type: ${type}`);
      throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

function getProvider(
  config: ProviderConfig,
  userIdentifier?: string,
): AnyProvider | null {
  const cacheKey = config.id;

  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  const provider = createProviderInstance(config, userIdentifier);
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
  userIdentifier?: string,
): LanguageModel {
  switch (providerConfig.type) {
    case "azure-openai": {
      const azureProvider = provider as AzureOpenAIProvider;
      const modelSettings = modelDef.settings as AzureOpenAIModel["settings"];
      const azureModel = azureProvider(modelDef.apiName, {
        ...modelSettings,
        ...(userIdentifier ? { user: userIdentifier } : {}),
      });
      return azureModel;
    }

    case "ollama": {
      const ollamaProvider = provider as OllamaProvider;
      const modelSettings = modelDef.settings as OllamaModel["settings"];
      return ollamaProvider(modelDef.apiName, {
        ...modelSettings,
        ...(userIdentifier ? { user: userIdentifier } : {}),
      });
    }

    case "openai": {
      const openaiProvider = provider as OpenAIProvider;
      const modelSettings = modelDef.settings as OpenAIModel["settings"];
      return openaiProvider(modelDef.apiName, {
        ...modelSettings,
        ...(userIdentifier ? { user: userIdentifier } : {}),
      });
    }

    case "google": {
      const googleProvider = provider as GoogleGenerativeAIProvider;
      const modelSettings = modelDef.settings as GoogleModel["settings"];
      return googleProvider(modelDef.apiName, {
        ...modelSettings,
      });
    }

    case "anthropic": {
      const anthropicProvider = provider as AnthropicProvider;
      const modelSettings = modelDef.settings as AnthropicModel["settings"];
      return anthropicProvider(modelDef.apiName, {
        ...modelSettings,
      });
    }

    case "xai": {
      const xaiProvider = provider as XaiProvider;
      const modelSettings = modelDef.settings as XAIModel["settings"];
      return xaiProvider(modelDef.apiName, {
        ...modelSettings,
        ...(userIdentifier ? { user: userIdentifier } : {}),
      });
    }

    case "openrouter": {
      const openrouterProvider = provider as OpenRouterProvider;
      const modelSettings = modelDef.settings as OpenRouterModel["settings"];
      return openrouterProvider(modelDef.apiName, {
        ...modelSettings,
        ...(userIdentifier ? { user: userIdentifier } : {}),
      });
    }

    case "openai-compatible": {
      const compatibleProvider = provider as OpenAICompatibleProvider;
      const modelSettings =
        modelDef.settings as OpenAICompatibleModel["settings"];
      return compatibleProvider(modelDef.apiName, {
        ...modelSettings,
        ...(userIdentifier ? { user: userIdentifier } : {}),
      });
    }

    default: {
      // TypeScript exhaustiveness check - this should never happen
      const type = (providerConfig as { type?: string }).type;
      logger.error(`Unknown provider type: ${type}`);
      throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

async function getModel(chatModel?: ChatModel): Promise<{
  model: LanguageModel;
  settings: ModelSettings;
  supportsTools: boolean;
} | null> {
  const passUserToApiCalls = parseEnvBoolean(
    process.env.PASS_USER_TO_API_CALLS,
  );
  const userHeaderValueField = process.env.API_END_USER_ID_FIELD || "email";

  let userIdentifier: string | undefined;

  if (passUserToApiCalls) {
    const session = await getSession();
    const user = session?.user;
    userIdentifier = user?.[userHeaderValueField];
  }

  // Fallback to first available model if none specified
  if (!chatModel) {
    const fallback = getFallbackModel(userIdentifier);
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
    const fallback = getFallbackModel(userIdentifier);
    if (!fallback) {
      throw new Error("No models available");
    }
    return fallback;
  }

  const { providerConfig, modelDef } = modelConfig;

  const provider = getProvider(providerConfig, userIdentifier);
  if (!provider) {
    logger.warn(`Failed to create provider: ${providerId}`);
    const fallback = getFallbackModel(userIdentifier);
    if (!fallback) {
      throw new Error("No models available");
    }
    return fallback;
  }

  try {
    const model = createModelInstance(
      provider,
      providerConfig,
      modelDef,
      userIdentifier,
    );
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
    const fallback = getFallbackModel(userIdentifier);
    if (!fallback) {
      throw new Error("No models available");
    }
    return fallback;
  }
}

function getFallbackModel(userIdentifier?: string): {
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
        const provider = getProvider(providerConfig, userIdentifier);
        if (!provider) continue;

        const model = createModelInstance(
          provider,
          providerConfig,
          modelDef,
          userIdentifier,
        );
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
  getModel: async (chatModel?: ChatModel) => {
    const result = await getModel(chatModel);
    if (!result) {
      throw new Error("No models available");
    }
    return result;
  },
};
