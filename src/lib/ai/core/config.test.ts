import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getAllProviderConfigs,
  getProviderConfig,
  getAvailableProviders,
  isProviderConfigured,
  getProviderModels,
  resetConfig,
} from "./config";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { resolve } from "path";
import {
  GoogleProviderConfig,
  OpenAICompatibleProviderConfig,
  OpenAIProviderConfig,
  OpenAIModel,
} from "@/types/models";

// Mock logger to suppress messages during tests
vi.mock("logger", () => ({
  default: {
    withDefaults: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

describe("Config Functions", () => {
  const originalEnv = process.env;
  const testConfigPath = resolve("test-models.json");

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };

    // Set required API keys for testing
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.MODEL_CONFIG_JSON_PATH = testConfigPath;

    // Reset cache
    resetConfig();
  });

  afterEach(() => {
    // Clean up test file
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }

    // Restore environment
    process.env = { ...originalEnv };

    // Reset cache
    resetConfig();
  });

  describe("Basic Configuration Loading", () => {
    it("should load valid configuration", () => {
      const config = {
        providers: [
          {
            id: "openai",
            type: "openai",
            name: "OpenAI",
            models: [
              {
                uiName: "GPT-4",
                apiName: "gpt-4",
                supportsTools: true,
              },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe("openai");
      expect(providers[0].providerSettings.apiKey).toBe("test-openai-key");
    });

    it("should handle missing config file gracefully", () => {
      // Don't create the config file
      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(0);
    });

    it("should handle invalid JSON gracefully", () => {
      writeFileSync(testConfigPath, "invalid json");

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(0);
    });

    it("should apply API keys from environment", () => {
      const config = {
        providers: [
          {
            id: "anthropic",
            type: "anthropic",
            name: "Anthropic",
            models: [
              { uiName: "Claude", apiName: "claude-3-5-sonnet-20241022" },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const provider = getProviderConfig("anthropic");
      expect(provider).not.toBeNull();
      expect(provider?.providerSettings.apiKey).toBe("test-anthropic-key");
    });
  });

  describe("Provider Functions", () => {
    beforeEach(() => {
      const config = {
        providers: [
          {
            id: "openai",
            type: "openai",
            name: "OpenAI",
            models: [
              { uiName: "GPT-4", apiName: "gpt-4" },
              { uiName: "GPT-3.5", apiName: "gpt-3.5-turbo" },
            ],
          },
          {
            id: "anthropic",
            type: "anthropic",
            name: "Anthropic",
            models: [
              { uiName: "Claude", apiName: "claude-3-5-sonnet-20241022" },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));
    });

    it("should get specific provider config", () => {
      const provider = getProviderConfig("openai");
      expect(provider).not.toBeNull();
      expect(provider?.id).toBe("openai");
      expect(provider?.name).toBe("OpenAI");
    });

    it("should return null for unknown provider", () => {
      const provider = getProviderConfig("unknown");
      expect(provider).toBeNull();
    });

    it("should get available provider IDs", () => {
      const providers = getAvailableProviders();
      expect(providers).toEqual(["openai", "anthropic"]);
    });

    it("should check if provider is configured", () => {
      expect(isProviderConfigured("openai")).toBe(true);
      expect(isProviderConfigured("anthropic")).toBe(true);
      expect(isProviderConfigured("unknown")).toBe(false);
    });

    it("should get provider models", () => {
      const models = getProviderModels("openai");
      expect(models).toHaveLength(2);
      expect(models[0].uiName).toBe("GPT-4");
      expect(models[1].uiName).toBe("GPT-3.5");
    });

    it("should return empty array for unknown provider models", () => {
      const models = getProviderModels("unknown");
      expect(models).toEqual([]);
    });
  });

  describe("Configuration Reloading", () => {
    it("should reload configuration when called", () => {
      // Create initial config
      const config1 = {
        providers: [
          {
            id: "openai",
            type: "openai",
            name: "OpenAI",
            models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
          },
        ],
      };
      writeFileSync(testConfigPath, JSON.stringify(config1, null, 2));

      // Load initial config
      let providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);

      // Update config file
      const config2 = {
        providers: [
          {
            id: "anthropic",
            type: "anthropic",
            name: "Anthropic",
            models: [
              { uiName: "Claude", apiName: "claude-3-5-sonnet-20241022" },
            ],
          },
        ],
      };
      writeFileSync(testConfigPath, JSON.stringify(config2, null, 2));

      // Reset cache and verify
      resetConfig();
      providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe("anthropic");
    });
  });

  describe("Multiple Provider Types", () => {
    it("should handle multiple provider types correctly", () => {
      // Set additional API keys
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key";
      process.env.XAI_API_KEY = "test-xai-key";

      const config = {
        providers: [
          {
            id: "openai",
            type: "openai",
            name: "OpenAI",
            models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
          },
          {
            id: "google",
            type: "google",
            name: "Google",
            models: [{ uiName: "Gemini Pro", apiName: "gemini-pro" }],
          },
          {
            id: "xai",
            type: "xai",
            name: "xAI",
            models: [{ uiName: "Grok", apiName: "grok-beta" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(3);

      expect(getProviderConfig("openai")?.providerSettings.apiKey).toBe(
        "test-openai-key",
      );
      expect(getProviderConfig("google")?.providerSettings.apiKey).toBe(
        "test-google-key",
      );
      expect(getProviderConfig("xai")?.providerSettings.apiKey).toBe(
        "test-xai-key",
      );
    });
  });

  describe("Error Handling", () => {
    it("should gracefully skip providers with missing API keys", () => {
      delete process.env.OPENAI_API_KEY;

      const config = {
        providers: [
          {
            id: "openai",
            type: "openai",
            name: "OpenAI",
            models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      // Provider with missing API key should be skipped
      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(0);
    });

    it("should handle providers that don't require API keys", () => {
      const config = {
        providers: [
          {
            id: "ollama",
            type: "ollama",
            name: "Ollama",
            requireApiKey: false,
            models: [{ uiName: "Llama 2", apiName: "llama2" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe("ollama");
    });

    it("should skip providers with schema validation errors", () => {
      const invalidConfig = {
        providers: [
          {
            // Missing required fields: id, type, name
            models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(invalidConfig, null, 2));

      // Invalid provider should be skipped
      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(0);
    });

    it("should skip providers with invalid provider types", () => {
      const invalidConfig = {
        providers: [
          {
            id: "invalid",
            type: "unknown-provider-type",
            name: "Invalid Provider",
            models: [{ uiName: "Test", apiName: "test" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(invalidConfig, null, 2));

      // Provider with invalid type should be skipped
      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(0);
    });
  });

  describe("Schema Validation and Transformation", () => {
    it("should validate and transform OpenAI provider configuration", () => {
      const config = {
        providers: [
          {
            id: "openai",
            type: "openai",
            name: "OpenAI",
            providerSettings: {
              baseURL: "https://api.openai.com/v1",
              organization: "test-org",
              project: "test-project",
            },
            models: [
              {
                uiName: "GPT-4",
                apiName: "gpt-4",
                supportsTools: true,
                settings: {
                  temperature: 0.7,
                  maxOutputTokens: 1000,
                  topP: 0.9,
                },
              },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);

      const provider = providers[0] as OpenAIProviderConfig;
      expect(provider.type).toBe("openai");
      expect(provider.providerSettings.apiKey).toBe("test-openai-key"); // Injected from env
      expect(provider.providerSettings.baseURL).toBe(
        "https://api.openai.com/v1",
      );
      expect(provider.providerSettings.organization).toBe("test-org");
      expect(provider.models[0].settings.temperature).toBe(0.7);
    });

    it("should validate and transform Google provider configuration", () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key";

      const config = {
        providers: [
          {
            id: "google",
            type: "google",
            name: "Google",
            models: [
              {
                uiName: "Gemini Pro",
                apiName: "gemini-pro",
                settings: {
                  temperature: 0.8,
                  topK: 40,
                  topP: 0.95,
                  safetySettings: [
                    {
                      category: "HARM_CATEGORY_HATE_SPEECH",
                      threshold: "BLOCK_MEDIUM_AND_ABOVE",
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);

      const provider = providers[0] as GoogleProviderConfig;
      expect(provider.type).toBe("google");
      expect(provider.providerSettings.apiKey).toBe("test-google-key");
      expect(provider.models[0].settings.safetySettings).toHaveLength(1);
    });

    it("should validate OpenAI Compatible provider with required baseURL", () => {
      process.env.CUSTOM_PROVIDER_API_KEY = "test-custom-key";

      const config = {
        providers: [
          {
            id: "custom-provider",
            type: "openai-compatible",
            name: "Custom Provider",
            providerSettings: {
              name: "Custom AI",
              baseURL: "https://api.custom.ai/v1",
            },
            models: [
              {
                uiName: "Custom Model",
                apiName: "custom-model",
                supportsTools: true,
              },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);

      const provider = providers[0] as OpenAICompatibleProviderConfig;
      expect(provider.type).toBe("openai-compatible");
      expect(provider.providerSettings.apiKey).toBe("test-custom-key");
      expect(provider.providerSettings.baseURL).toBe(
        "https://api.custom.ai/v1",
      );
      expect(provider.providerSettings.name).toBe("Custom AI");
    });

    it("should reject OpenAI Compatible provider without required baseURL", () => {
      const config = {
        providers: [
          {
            id: "invalid-custom",
            type: "openai-compatible",
            name: "Invalid Custom",
            providerSettings: {
              name: "Missing BaseURL",
              // Missing required baseURL
            },
            models: [
              {
                uiName: "Custom Model",
                apiName: "custom-model",
              },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(0); // Should be rejected due to missing baseURL
    });

    it("should apply default provider settings correctly", () => {
      const config = {
        providers: [
          {
            id: "anthropic",
            type: "anthropic",
            name: "Anthropic",
            // No explicit providerSettings - should use defaults
            models: [
              {
                uiName: "Claude",
                apiName: "claude-3-5-sonnet-20241022",
              },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);

      const provider = providers[0];
      expect(provider.providerSettings.apiKey).toBe("test-anthropic-key");
      expect(provider.providerSettings.baseURL).toBe(
        "https://api.anthropic.com/v1",
      ); // Default
    });

    it("should handle model settings validation", () => {
      const config = {
        providers: [
          {
            id: "openai",
            type: "openai",
            name: "OpenAI",
            models: [
              {
                uiName: "GPT-4 with advanced settings",
                apiName: "gpt-4",
                supportsTools: true,
                supportsVoice: true,
                settings: {
                  temperature: 0.7,
                  maxOutputTokens: 2000,
                  topP: 0.9,
                  presencePenalty: 0.1,
                  frequencyPenalty: 0.1,
                  seed: 12345,
                  reasoningEffort: "medium",
                  structuredOutputs: true,
                  maxCompletionTokens: 1000,
                  serviceTier: "auto",
                },
              },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);

      const model = providers[0].models[0] as OpenAIModel;
      expect(model.settings.temperature).toBe(0.7);
      expect(model.settings.reasoningEffort).toBe("medium");
      expect(model.settings.structuredOutputs).toBe(true);
      expect(model.supportsTools).toBe(true);
      expect(model.supportsVoice).toBe(true);
    });
  });

  describe("API Key Environment Variable Resolution", () => {
    it("should resolve API keys for standard providers", () => {
      process.env.XAI_API_KEY = "test-xai-key";
      process.env.OPENROUTER_API_KEY = "test-openrouter-key";

      const config = {
        providers: [
          {
            id: "xai",
            type: "xai",
            name: "xAI",
            models: [{ uiName: "Grok", apiName: "grok-beta" }],
          },
          {
            id: "openrouter",
            type: "openrouter",
            name: "OpenRouter",
            models: [
              {
                uiName: "Claude via OpenRouter",
                apiName: "anthropic/claude-3-5-sonnet",
              },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(2);

      expect(getProviderConfig("xai")?.providerSettings.apiKey).toBe(
        "test-xai-key",
      );
      expect(getProviderConfig("openrouter")?.providerSettings.apiKey).toBe(
        "test-openrouter-key",
      );
    });

    it("should generate correct env var names for custom provider IDs", () => {
      process.env.MY_CUSTOM_PROVIDER_API_KEY = "test-custom-key";

      const config = {
        providers: [
          {
            id: "my-custom-provider",
            type: "openai-compatible",
            name: "My Custom Provider",
            providerSettings: {
              name: "Custom",
              baseURL: "https://api.custom.ai/v1",
            },
            models: [{ uiName: "Custom Model", apiName: "custom" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);
      expect(providers[0].providerSettings.apiKey).toBe("test-custom-key");
    });

    it("should use fallback logic: default API key first, then ID-based", () => {
      // Remove default OpenAI key and set ID-based key
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      process.env.OPENAI_DEV_API_KEY = "dev-fallback-key";

      const config = {
        providers: [
          {
            id: "openai-dev",
            type: "openai",
            name: "OpenAI Development",
            models: [{ uiName: "GPT-4 Dev", apiName: "gpt-4" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);
      expect(getProviderConfig("openai-dev")?.providerSettings.apiKey).toBe(
        "dev-fallback-key",
      );

      // Cleanup
      delete process.env.OPENAI_DEV_API_KEY;
      if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey;
    });

    it("should prefer ID-based API key over default when both exist", () => {
      // Set both default and ID-based keys
      process.env.OPENAI_API_KEY = "default-key";
      process.env.OPENAI_DEV_API_KEY = "dev-key";

      const config = {
        providers: [
          {
            id: "openai-dev",
            type: "openai",
            name: "OpenAI Development",
            models: [{ uiName: "GPT-4 Dev", apiName: "gpt-4" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(1);
      expect(getProviderConfig("openai-dev")?.providerSettings.apiKey).toBe(
        "dev-key",
      );

      // Cleanup
      delete process.env.OPENAI_DEV_API_KEY;
    });

    it("should handle multiple instances with different fallback strategies", () => {
      // Setup: default key exists, but per-instance keys override
      process.env.OPENAI_API_KEY = "shared-key";
      process.env.OPENAI_PROD_API_KEY = "prod-specific-key";
      // No OPENAI_DEV_API_KEY - should fall back to shared

      const config = {
        providers: [
          {
            id: "openai-dev",
            type: "openai",
            name: "OpenAI Development",
            models: [{ uiName: "GPT-4 Dev", apiName: "gpt-4" }],
          },
          {
            id: "openai-prod",
            type: "openai",
            name: "OpenAI Production",
            models: [{ uiName: "GPT-4 Prod", apiName: "gpt-4" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const providers = getAllProviderConfigs();
      expect(providers).toHaveLength(2);

      // Dev should use shared key (fallback)
      expect(getProviderConfig("openai-dev")?.providerSettings.apiKey).toBe(
        "shared-key",
      );
      // Prod should use specific key
      expect(getProviderConfig("openai-prod")?.providerSettings.apiKey).toBe(
        "prod-specific-key",
      );

      // Cleanup
      delete process.env.OPENAI_PROD_API_KEY;
    });
  });

  describe("Provider Configuration Status", () => {
    it("should correctly identify configured providers", () => {
      resetConfig(); // Explicit reset for this test

      const config = {
        providers: [
          {
            id: "configured-openai",
            type: "openai",
            name: "Configured OpenAI",
            models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
          },
          {
            id: "configured-anthropic",
            type: "anthropic",
            name: "Configured Anthropic",
            models: [
              { uiName: "Claude", apiName: "claude-3-5-sonnet-20241022" },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      // Check what providers were actually loaded
      getAllProviderConfigs();

      expect(isProviderConfigured("configured-openai")).toBe(true);
      expect(isProviderConfigured("configured-anthropic")).toBe(true);
      expect(isProviderConfigured("nonexistent")).toBe(false);
    });

    it("should gracefully skip providers with missing API keys", () => {
      // Delete the API key for one provider
      delete process.env.ANTHROPIC_API_KEY;

      const config = {
        providers: [
          {
            id: "openai-valid",
            type: "openai",
            name: "Valid OpenAI",
            models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
          },
          {
            id: "anthropic-invalid",
            type: "anthropic",
            name: "Invalid Anthropic",
            models: [
              { uiName: "Claude", apiName: "claude-3-5-sonnet-20241022" },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      // Only the valid provider should be loaded, invalid one should be skipped
      const allProviders = getAvailableProviders();
      expect(allProviders).toEqual(["openai-valid"]);

      // The invalid provider should not be available for configuration check
      expect(isProviderConfigured("anthropic-invalid")).toBe(false);
      expect(isProviderConfigured("openai-valid")).toBe(true);
    });

    it("should handle providers that don't require API keys", () => {
      const config = {
        providers: [
          {
            id: "ollama-local",
            type: "ollama",
            name: "Local Ollama",
            requireApiKey: false,
            models: [{ uiName: "Llama 2", apiName: "llama2" }],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      expect(isProviderConfigured("ollama-local")).toBe(false); // No API key set for Ollama
      expect(getAvailableProviders()).toEqual(["ollama-local"]);
    });

    it("should skip completely invalid providers but keep valid ones", () => {
      const config = {
        providers: [
          {
            id: "valid-openai",
            type: "openai",
            name: "Valid OpenAI",
            models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
          },
          {
            // Invalid provider - missing required fields
            invalidField: "this will be skipped",
            models: [{ uiName: "Should not work", apiName: "invalid" }],
          },
          {
            id: "valid-anthropic",
            type: "anthropic",
            name: "Valid Anthropic",
            models: [
              { uiName: "Claude", apiName: "claude-3-5-sonnet-20241022" },
            ],
          },
        ],
      };

      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      // Should load only the valid providers, skip the invalid one
      const allProviders = getAvailableProviders();
      expect(allProviders).toEqual(["valid-openai", "valid-anthropic"]);
      expect(allProviders).toHaveLength(2);
    });
  });
});
