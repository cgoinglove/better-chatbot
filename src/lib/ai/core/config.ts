import "server-only";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import defaultLogger from "logger";
import { colorize } from "consola/utils";
import {
  OpenAIProviderSchema,
  GoogleProviderSchema,
  AnthropicProviderSchema,
  XAIProviderSchema,
  OpenRouterProviderSchema,
  OllamaProviderSchema,
  AzureOpenAIProviderSchema,
  OpenAICompatibleProviderSchema,
  type ProviderConfig,
} from "@/types/models";

const logger = defaultLogger.withDefaults({
  message: colorize("blue", "Model Config: "),
});

// Simple cache for loaded configurations
let cachedConfig: {
  providers: ProviderConfig[];
  configPath: string;
} | null = null;

/**
 * Load and process model configuration from JSON file
 * This handles both validation and runtime transformation (adding API keys from env vars)
 */
function loadModelConfig(configPath?: string): ProviderConfig[] {
  const defaultConfigPath = resolve(
    configPath || process.env.MODEL_CONFIG_JSON_PATH || "./config/models.json",
  );

  // Return cached result if same path
  if (cachedConfig?.configPath === defaultConfigPath) {
    return cachedConfig.providers;
  }

  try {
    if (!existsSync(defaultConfigPath)) {
      logger.warn(`Model config file not found: ${defaultConfigPath}`);
      cachedConfig = { providers: [], configPath: defaultConfigPath };
      return [];
    }

    const configContent = readFileSync(defaultConfigPath, "utf-8");
    const parsedConfig = JSON.parse(configContent);

    // Validate the basic structure
    if (!parsedConfig.providers || !Array.isArray(parsedConfig.providers)) {
      throw new Error("Config must have a 'providers' array");
    }

    // Validate each provider individually and collect valid ones
    const validProviders: ProviderConfig[] = [];

    for (const provider of parsedConfig.providers) {
      try {
        // Validate each provider using its specific schema based on type
        let validatedProvider: ProviderConfig;

        switch (provider.type) {
          case "openai":
            validatedProvider = OpenAIProviderSchema.parse(provider);
            break;
          case "google":
            validatedProvider = GoogleProviderSchema.parse(provider);
            break;
          case "anthropic":
            validatedProvider = AnthropicProviderSchema.parse(provider);
            break;
          case "xai":
            validatedProvider = XAIProviderSchema.parse(provider);
            break;
          case "openrouter":
            validatedProvider = OpenRouterProviderSchema.parse(provider);
            break;
          case "ollama":
            validatedProvider = OllamaProviderSchema.parse(provider);
            break;
          case "azure-openai":
            validatedProvider = AzureOpenAIProviderSchema.parse(provider);
            break;
          case "openai-compatible":
            validatedProvider = OpenAICompatibleProviderSchema.parse(provider);
            break;
          default:
            throw new Error(`Unknown provider type: ${provider?.type}`);
        }

        validProviders.push(validatedProvider);
      } catch (error) {
        logger.warn(
          `❌ Skipping invalid provider "${provider?.id || "unknown"}":`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    logger.info(
      `✅ Loaded ${validProviders.length} valid providers from: ${defaultConfigPath}`,
    );

    // Cache the result
    cachedConfig = {
      providers: validProviders,
      configPath: defaultConfigPath,
    };

    return validProviders;
  } catch (error) {
    logger.error("Failed to load model configuration:", error);
    cachedConfig = { providers: [], configPath: defaultConfigPath };
    return [];
  }
}

/**
 * Get all available provider configurations
 */
export function getAllProviderConfigs(): ProviderConfig[] {
  return loadModelConfig();
}

/**
 * Get a specific provider's configuration
 */
export function getProviderConfig(providerId: string): ProviderConfig | null {
  const providers = loadModelConfig();
  return providers.find((config) => config.id === providerId) || null;
}

/**
 * Get all available provider IDs
 */
export function getAvailableProviders(): string[] {
  return loadModelConfig().map((config) => config.id);
}

/**
 * Check if a provider is configured (has required API key)
 */
export function isProviderConfigured(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  if (!config) return false;
  return Boolean(config.providerSettings.apiKey);
}

/**
 * Get models for a specific provider
 */
export function getProviderModels(providerId: string) {
  const config = getProviderConfig(providerId);
  return config ? config.models : [];
}

/**
 * Reset configuration cache
 * Note: In development, you'll need to restart the server after making changes to config/models.json
 */
export function resetConfig(): void {
  cachedConfig = null;
}
