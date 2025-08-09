import { describe, it, expect, beforeEach, vi } from "vitest";
import { modelRegistry } from "./models";
import type { ChatModel } from "@/types/chat";

// Mock the config module with simple, predictable behavior
vi.mock("./config", () => ({
  getAllProviderConfigs: vi.fn(),
  getProviderConfig: vi.fn(),
  isProviderConfigured: vi.fn(),
}));

// Mock all the AI SDK providers with simple implementations
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() =>
    vi.fn((modelName: string) => ({
      modelId: `openai:${modelName}`,
      specificationVersion: "v1",
      provider: "openai",
    })),
  ),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() =>
    vi.fn((modelName: string) => ({
      modelId: `anthropic:${modelName}`,
      specificationVersion: "v1",
      provider: "anthropic",
    })),
  ),
}));

// Mock other providers as not implemented for simplicity
vi.mock("@ai-sdk/azure", () => ({ createAzure: vi.fn() }));
vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: vi.fn() }));
vi.mock("@ai-sdk/xai", () => ({ createXai: vi.fn() }));
vi.mock("@openrouter/ai-sdk-provider", () => ({ createOpenRouter: vi.fn() }));
vi.mock("ollama-ai-provider", () => ({ createOllama: vi.fn() }));
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: vi.fn(),
}));

// Mock logger
vi.mock("logger", () => ({
  default: {
    withDefaults: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("Model Registry", () => {
  const sampleProviderConfigs = [
    {
      id: "openai",
      type: "openai",
      name: "OpenAI",
      providerSettings: { apiKey: "test-key" },
      models: [
        {
          uiName: "GPT-4",
          apiName: "gpt-4",
          supportsTools: true,
          settings: { temperature: 0.7 },
        },
        {
          uiName: "GPT-3.5",
          apiName: "gpt-3.5-turbo",
          supportsTools: true,
          settings: {},
        },
      ],
    },
    {
      id: "anthropic",
      type: "anthropic",
      name: "Anthropic",
      providerSettings: { apiKey: "test-key" },
      models: [
        {
          uiName: "Claude Sonnet",
          apiName: "claude-3-5-sonnet-20241022",
          supportsTools: true,
          settings: { temperature: 0.8 },
        },
      ],
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked config functions
    const configModule = await import("./config");
    const mockGetAllProviderConfigs = configModule.getAllProviderConfigs as any;
    const mockGetProviderConfig = configModule.getProviderConfig as any;
    const mockIsProviderConfigured = configModule.isProviderConfigured as any;

    // Setup default working state
    mockGetAllProviderConfigs.mockReturnValue(sampleProviderConfigs);
    mockGetProviderConfig.mockImplementation(
      (id: string) => sampleProviderConfigs.find((c) => c.id === id) || null,
    );
    mockIsProviderConfigured.mockImplementation((id: string) =>
      ["openai", "anthropic"].includes(id),
    );
  });

  describe("modelsInfo", () => {
    it("should return models info for configured providers", () => {
      const modelsInfo = modelRegistry.modelsInfo;

      expect(modelsInfo).toHaveLength(2);
      expect(modelsInfo[0]).toEqual({
        provider: "openai",
        models: [
          { name: "GPT-4", supportsTools: true },
          { name: "GPT-3.5", supportsTools: true },
        ],
      });
      expect(modelsInfo[1]).toEqual({
        provider: "anthropic",
        models: [{ name: "Claude Sonnet", supportsTools: true }],
      });
    });

    it("should return empty array when no providers are configured", async () => {
      const configModule = await import("./config");
      (configModule.getAllProviderConfigs as any).mockReturnValue([]);

      const modelsInfo = modelRegistry.modelsInfo;
      expect(modelsInfo).toEqual([]);
    });

    it("should filter out unconfigured providers", async () => {
      const configModule = await import("./config");
      (configModule.isProviderConfigured as any).mockImplementation(
        (id: string) => id === "openai",
      );

      const modelsInfo = modelRegistry.modelsInfo;
      expect(modelsInfo).toHaveLength(1);
      expect(modelsInfo[0].provider).toBe("openai");
    });
  });

  describe("getModel", () => {
    it("should get model with specified chat model", () => {
      const chatModel: ChatModel = {
        provider: "openai",
        model: "GPT-4",
      };

      const result = modelRegistry.getModel(chatModel);

      expect(result).toBeDefined();
      expect(result.model.modelId).toBe("openai:gpt-4");
      expect(result.settings).toEqual({ temperature: 0.7 });
      expect(result.supportsTools).toBe(true);
    });

    it("should get model without specified chat model (fallback)", () => {
      const result = modelRegistry.getModel();

      expect(result).toBeDefined();
      expect(result.model.modelId).toBe("openai:gpt-4");
      expect(result.supportsTools).toBe(true);
    });

    it("should handle model settings correctly", () => {
      const chatModel: ChatModel = {
        provider: "openai",
        model: "GPT-3.5", // This one has empty settings
      };

      const result = modelRegistry.getModel(chatModel);
      expect(result.settings).toEqual({});
    });

    it("should default supportsTools to true when not specified", async () => {
      const configModule = await import("./config");
      (configModule.getProviderConfig as any).mockReturnValue({
        id: "openai",
        type: "openai",
        name: "OpenAI",
        providerSettings: { apiKey: "test" },
        models: [{ uiName: "GPT-4", apiName: "gpt-4" }], // No supportsTools field
      });

      const result = modelRegistry.getModel({
        provider: "openai",
        model: "GPT-4",
      });

      expect(result.supportsTools).toBe(true);
    });

    it("should throw error when no models are available", async () => {
      const configModule = await import("./config");
      (configModule.getAllProviderConfigs as any).mockReturnValue([]);
      (configModule.isProviderConfigured as any).mockReturnValue(false);

      expect(() => {
        modelRegistry.getModel();
      }).toThrow("No AI models are configured");
    });

    it("should fall back when model not found", () => {
      const chatModel: ChatModel = {
        provider: "openai",
        model: "NonExistentModel",
      };

      // Should fall back to first available model
      const result = modelRegistry.getModel(chatModel);
      expect(result.model.modelId).toBe("openai:gpt-4");
    });

    it("should fall back when provider not found", () => {
      const chatModel: ChatModel = {
        provider: "nonexistent",
        model: "some-model",
      };

      // Should fall back to first available model
      const result = modelRegistry.getModel(chatModel);
      expect(result.model.modelId).toBe("openai:gpt-4");
    });
  });
});
