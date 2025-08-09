import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  UnifiedJsonModelConfigSchema,
  UnifiedProviderConfigSchema,
  OpenAIModelSchema,
  GoogleModelSchema,
  AnthropicModelSchema,
  OpenAIProviderSchema,
  AzureOpenAIProviderSchema,
  OpenAICompatibleProviderSchema,
  PROVIDER_SETTINGS,
} from "./models";

describe("Model Type Schemas", () => {
  // Store original env vars and restore after tests
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set required API keys for testing
    process.env.OPENAI_API_KEY = "test-key";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("Unified Config Schema", () => {
    it("should validate a basic config with OpenAI provider", () => {
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

      const result = UnifiedJsonModelConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should validate a config with multiple providers", () => {
      const config = {
        providers: [
          {
            id: "openai",
            type: "openai",
            name: "OpenAI",
            models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
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

      const result = UnifiedJsonModelConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject config without providers array", () => {
      const config = { notProviders: [] };

      const result = UnifiedJsonModelConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toContain("providers");
    });

    it("should allow empty providers array", () => {
      const config = { providers: [] };

      const result = UnifiedJsonModelConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Runtime Config Schema (with transforms)", () => {
    it("should apply transforms and add API keys from environment", () => {
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

      const result = UnifiedProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        const provider = result.data.providers[0];
        expect(provider.providerSettings.apiKey).toBe("test-key");
        expect(provider.providerSettings.baseURL).toBe(
          "https://api.openai.com/v1",
        );
      }
    });

    it("should fail when required API key is missing", () => {
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

      // The transform throws an error, so we need to catch it
      expect(() => {
        UnifiedProviderConfigSchema.parse(config);
      }).toThrow("OPENAI_API_KEY environment variable is required");
    });
  });

  describe("Model Schemas", () => {
    it("should validate OpenAI model with basic fields", () => {
      const model = {
        uiName: "GPT-4",
        apiName: "gpt-4",
        supportsTools: true,
      };

      const result = OpenAIModelSchema.safeParse(model);
      expect(result.success).toBe(true);
    });

    it("should validate OpenAI model with advanced settings", () => {
      const model = {
        uiName: "GPT-4",
        apiName: "gpt-4",
        supportsTools: true,
        settings: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          reasoningEffort: "medium",
          structuredOutputs: true,
        },
      };

      const result = OpenAIModelSchema.safeParse(model);
      expect(result.success).toBe(true);
    });

    it("should validate Google model with safety settings", () => {
      const model = {
        uiName: "Gemini Pro",
        apiName: "gemini-pro",
        settings: {
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        },
      };

      const result = GoogleModelSchema.safeParse(model);
      expect(result.success).toBe(true);
    });

    it("should validate Anthropic model with thinking settings", () => {
      const model = {
        uiName: "Claude Sonnet",
        apiName: "claude-3-5-sonnet-20241022",
        settings: {
          thinking: {
            thinkingBudget: 1000,
          },
        },
      };

      const result = AnthropicModelSchema.safeParse(model);
      expect(result.success).toBe(true);
    });

    it("should require uiName and apiName", () => {
      const model = {
        supportsTools: true,
      };

      const result = OpenAIModelSchema.safeParse(model);
      expect(result.success).toBe(false);
      expect(
        result.error?.issues.some((issue) => issue.path.includes("uiName")),
      ).toBe(true);
      expect(
        result.error?.issues.some((issue) => issue.path.includes("apiName")),
      ).toBe(true);
    });

    it("should reject invalid enum values", () => {
      const model = {
        uiName: "GPT-4",
        apiName: "gpt-4",
        settings: {
          reasoningEffort: "invalid-effort",
        },
      };

      const result = OpenAIModelSchema.safeParse(model);
      expect(result.success).toBe(false);
    });
  });

  describe("Provider Validation", () => {
    it("should require id, name, and type", () => {
      const provider = {
        models: [],
      };

      const result = UnifiedJsonModelConfigSchema.safeParse({
        providers: [provider],
      });
      expect(result.success).toBe(false);
    });

    it("should reject unknown provider types", () => {
      const provider = {
        id: "unknown",
        type: "unknown-provider",
        name: "Unknown Provider",
        models: [],
      };

      const result = UnifiedJsonModelConfigSchema.safeParse({
        providers: [provider],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Provider Settings and Defaults", () => {
    it("should apply default settings from PROVIDER_SETTINGS", () => {
      expect(PROVIDER_SETTINGS.openai?.baseURL).toBe(
        "https://api.openai.com/v1",
      );
      expect(PROVIDER_SETTINGS.google?.apiKeyEnvVar).toBe(
        "GOOGLE_GENERATIVE_AI_API_KEY",
      );
      expect(PROVIDER_SETTINGS.anthropic?.baseURL).toBe(
        "https://api.anthropic.com/v1",
      );
    });

    it("should validate OpenAI provider with custom settings", () => {
      const config = {
        id: "openai",
        type: "openai",
        name: "OpenAI",
        providerSettings: {
          baseURL: "https://custom.openai.com/v1",
          project: "my-project",
          organization: "my-org",
        },
        models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
      };

      const result = OpenAIProviderSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.providerSettings.baseURL).toBe(
          "https://custom.openai.com/v1",
        );
        expect(result.data.providerSettings.project).toBe("my-project");
        expect(result.data.providerSettings.apiKey).toBe("test-key");
      }
    });

    it("should validate Azure OpenAI provider", () => {
      process.env.AZURE_API_KEY = "azure-test-key";

      const config = {
        id: "azure-openai",
        type: "azure-openai",
        name: "Azure OpenAI",
        models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
      };

      const result = AzureOpenAIProviderSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.providerSettings.apiKey).toBe("azure-test-key");
      }
    });

    it("should validate OpenAI Compatible provider with required baseURL", () => {
      process.env.CUSTOM_PROVIDER_API_KEY = "custom-key";

      const config = {
        id: "custom-provider",
        type: "openai-compatible",
        name: "Custom Provider",
        providerSettings: {
          name: "Custom AI",
          baseURL: "https://api.custom.ai/v1",
        },
        models: [{ uiName: "Custom Model", apiName: "custom-model" }],
      };

      const result = OpenAICompatibleProviderSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.providerSettings.baseURL).toBe(
          "https://api.custom.ai/v1",
        );
        expect(result.data.providerSettings.name).toBe("Custom AI");
      }
    });

    it("should reject OpenAI Compatible provider without required baseURL", () => {
      const config = {
        id: "custom-provider",
        type: "openai-compatible",
        name: "Custom Provider",
        providerSettings: {
          name: "Custom AI",
        },
        models: [],
      };

      const result = OpenAICompatibleProviderSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("API Key Environment Variable Handling", () => {
    it("should reject providers with API keys in config", () => {
      const config = {
        id: "openai",
        type: "openai",
        name: "OpenAI",
        providerSettings: {
          apiKey: "should-not-be-here",
        },
        models: [],
      };

      expect(() => {
        OpenAIProviderSchema.parse(config);
      }).toThrow("API keys must not be set in config files");
    });

    it("should handle providers with requireApiKey=false", () => {
      delete process.env.OLLAMA_API_KEY;

      const config = {
        id: "ollama",
        type: "ollama",
        name: "Ollama",
        requireApiKey: false,
        models: [{ uiName: "Llama", apiName: "llama2" }],
      };

      // This should not throw even without the API key
      const result = UnifiedProviderConfigSchema.safeParse({
        providers: [config],
      });
      expect(result.success).toBe(true);
    });

    it("should generate correct API key env var names for custom providers", () => {
      // Test the fallback API key generation logic
      const config = {
        id: "custom-provider",
        type: "openai-compatible",
        name: "Custom Provider",
        providerSettings: {
          name: "Custom",
          baseURL: "https://api.custom.ai/v1",
        },
        models: [],
      };

      // Set the expected env var
      process.env.CUSTOM_PROVIDER_API_KEY = "test-key";

      const result = OpenAICompatibleProviderSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.providerSettings.apiKey).toBe("test-key");
      }
    });

    it("should use fallback logic for API key resolution", () => {
      // Test OpenAI with ID-based fallback
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY; // Remove default
      process.env.OPENAI_DEV_API_KEY = "dev-fallback-key"; // Set ID-based

      const config = {
        id: "openai-dev",
        type: "openai",
        name: "OpenAI Dev",
        models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
      };

      const result = OpenAIProviderSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.providerSettings.apiKey).toBe("dev-fallback-key");
      }

      // Cleanup
      delete process.env.OPENAI_DEV_API_KEY;
      if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey;
    });

    it("should prefer ID-based API key over default", () => {
      // Set both default and ID-based
      process.env.OPENAI_API_KEY = "default-key";
      process.env.OPENAI_DEV_API_KEY = "dev-key";

      const config = {
        id: "openai-dev",
        type: "openai",
        name: "OpenAI Dev",
        models: [{ uiName: "GPT-4", apiName: "gpt-4" }],
      };

      const result = OpenAIProviderSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.providerSettings.apiKey).toBe("dev-key");
      }

      // Cleanup
      delete process.env.OPENAI_DEV_API_KEY;
    });
  });

  describe("Advanced Model Settings", () => {
    it("should validate OpenAI model with all advanced settings", () => {
      const model = {
        uiName: "GPT-4",
        apiName: "gpt-4",
        supportsTools: true,
        supportsVoice: true,
        settings: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.9,
          presencePenalty: 0.1,
          frequencyPenalty: 0.1,
          seed: 12345,
          reasoningEffort: "medium",
          structuredOutputs: true,
          maxCompletionTokens: 500,
          store: true,
          serviceTier: "auto",
          voice: "alloy",
          inputAudioTranscription: {
            model: "whisper-1",
          },
        },
      };

      const result = OpenAIModelSchema.safeParse(model);
      expect(result.success).toBe(true);
    });

    it("should validate Google model with all settings", () => {
      const model = {
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
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH",
            },
          ],
          thinkingConfig: {
            thinkingBudget: 1000,
            includeThoughts: true,
          },
          responseModalities: ["TEXT", "IMAGE"],
        },
      };

      const result = GoogleModelSchema.safeParse(model);
      expect(result.success).toBe(true);
    });

    it("should validate Anthropic model with caching and thinking", () => {
      const model = {
        uiName: "Claude Sonnet",
        apiName: "claude-3-5-sonnet-20241022",
        settings: {
          sendReasoning: true,
          thinking: {
            thinkingBudget: 2000,
          },
          providerOptions: {
            anthropic: {
              cacheControl: {
                type: "ephemeral",
                ttl: "1h",
              },
            },
          },
        },
      };

      const result = AnthropicModelSchema.safeParse(model);
      expect(result.success).toBe(true);
    });
  });
});
