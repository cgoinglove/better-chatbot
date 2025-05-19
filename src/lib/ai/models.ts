import { ollama } from "ollama-ai-provider";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { LanguageModel, wrapLanguageModel } from "ai";
import { gemmaToolMiddleware } from "@ai-sdk-tool/parser";

export interface ModelInfo {
  /** The short ID used internally in the app */
  id: string;
  /** The provider of the model (openai, google, anthropic, etc.) */
  provider: string;
  /** The full name/ID of the model used with the provider */
  fullName: string;
  /** Maximum token context window size */
  maxTokens: number;
  /** Whether the model supports tool calling */
  supportsToolCalling: boolean;
  /** The actual model instance */
  model: LanguageModel;
}

/**
 * Registry of all available models with their complete information
 */
class ModelRegistry {
  models: Map<string, ModelInfo> = new Map();
  defaultModelId: string = "4o";

  constructor() {
    this.registerModels();
  }

  /**
   * Register all available models
   */
  private registerModels(): void {
    // OpenAI models
    this.register({
      id: "4o",
      provider: "openai",
      fullName: "gpt-4o",
      maxTokens: 128000,
      supportsToolCalling: true,
      model: openai("gpt-4o"),
    });

    this.register({
      id: "4o-mini",
      provider: "openai",
      fullName: "gpt-4o-mini",
      maxTokens: 128000,
      supportsToolCalling: true,
      model: openai("gpt-4o-mini", {}),
    });

    this.register({
      id: "gpt-4.1",
      provider: "openai",
      fullName: "gpt-4.1",
      maxTokens: 128000,
      supportsToolCalling: true,
      model: openai("gpt-4.1"),
    });

    this.register({
      id: "gpt-4.1-mini",
      provider: "openai",
      fullName: "gpt-4.1-mini",
      maxTokens: 128000,
      supportsToolCalling: true,
      model: openai("gpt-4.1-mini"),
    });

    this.register({
      id: "o4-mini",
      provider: "openai",
      fullName: "o4-mini",
      maxTokens: 128000,
      supportsToolCalling: false,
      model: openai("o4-mini", {
        reasoningEffort: "medium",
      }),
    });

    // Google models
    this.register({
      id: "gemini-2.5-flash",
      provider: "google",
      fullName: "gemini-2.5-flash-preview-04-17",
      maxTokens: 1000000,
      supportsToolCalling: true,
      model: google("gemini-2.5-flash-preview-04-17"),
    });

    this.register({
      id: "gemini-2.5-pro",
      provider: "google",
      fullName: "gemini-2.5-pro-exp-03-25",
      maxTokens: 1000000,
      supportsToolCalling: true,
      model: google("gemini-2.5-pro-exp-03-25"),
    });

    // Anthropic models
    this.register({
      id: "claude-3-5-sonnet",
      provider: "anthropic",
      fullName: "claude-3-5-sonnet-latest",
      maxTokens: 200000,
      supportsToolCalling: true,
      model: anthropic("claude-3-5-sonnet-latest"),
    });

    this.register({
      id: "claude-3-7-sonnet",
      provider: "anthropic",
      fullName: "claude-3-7-sonnet-latest",
      maxTokens: 200000,
      supportsToolCalling: true,
      model: anthropic("claude-3-7-sonnet-latest"),
    });

    // xAI models
    this.register({
      id: "grok-2",
      provider: "xai",
      fullName: "grok-2-1212",
      maxTokens: 32000,
      supportsToolCalling: false,
      model: xai("grok-2-1212"),
    });

    this.register({
      id: "grok-3-mini",
      provider: "xai",
      fullName: "grok-3-mini-latest",
      maxTokens: 32000,
      supportsToolCalling: false,
      model: xai("grok-3-mini-latest"),
    });

    this.register({
      id: "grok-3",
      provider: "xai",
      fullName: "grok-3-latest",
      maxTokens: 32000,
      supportsToolCalling: false,
      model: xai("grok-3-latest"),
    });

    // Ollama models
    this.register({
      id: "gemma3:1b",
      provider: "ollama",
      fullName: "gemma3:1b",
      maxTokens: 32768,
      supportsToolCalling: false,
      model: ollama("gemma3:1b"),
    });

    this.register({
      id: "gemma3:4b",
      provider: "ollama",
      fullName: "gemma3:4b",
      maxTokens: 32768,
      supportsToolCalling: true,
      model: wrapLanguageModel({
        model: ollama("gemma3:4b", {
          simulateStreaming: true,
        }),
        middleware: gemmaToolMiddleware,
      }),
    });

    this.register({
      id: "gemma3:12b",
      provider: "ollama",
      fullName: "gemma3:12b",
      maxTokens: 32768,
      supportsToolCalling: true,
      model: wrapLanguageModel({
        model: ollama("gemma3:12b"),
        middleware: gemmaToolMiddleware,
      }),
    });
  }

  /**
   * Register a model
   */
  private register(modelInfo: ModelInfo): void {
    this.models.set(modelInfo.id, modelInfo);
  }

  /**
   * Get a model by its ID
   */
  getModel(id?: string): LanguageModel {
    const modelId = id || this.defaultModelId;
    const modelInfo = this.models.get(modelId);

    if (!modelInfo) {
      console.warn(`Model ${modelId} not found, using default`);
      return this.models.get(this.defaultModelId)!.model;
    }

    return modelInfo.model;
  }

  /**
   * Get model info by ID
   */
  getModelInfo(id?: string): ModelInfo | undefined {
    return this.models.get(id || this.defaultModelId);
  }

  /**
   * Check if a model supports tool calling
   */
  supportsToolCalling(id?: string): boolean {
    const modelInfo = this.getModelInfo(id);
    return modelInfo ? modelInfo.supportsToolCalling : false;
  }

  /**
   * Get the token limit for a model
   */
  getModelTokenLimit(id?: string): number {
    const modelInfo = this.getModelInfo(id);
    return modelInfo ? modelInfo.maxTokens : 32000; // Default fallback
  }

  /**
   * Get all models grouped by provider
   */
  getAllModelsGroupedByProvider(): Record<string, Record<string, LanguageModel>> {
    const result: Record<string, Record<string, LanguageModel>> = {};

    this.models.forEach((info) => {
      if (!result[info.provider]) {
        result[info.provider] = {};
      }
      result[info.provider][info.id] = info.model;
    });

    return result;
  }

  /**
   * Get model info for all models grouped by provider
   */
  getModelsInfo(): Array<{
    provider: string;
    models: Array<{ name: string; isToolCallUnsupported: boolean }>;
  }> {
    const providers = new Map<
      string,
      Array<{ name: string; isToolCallUnsupported: boolean }>
    >();

    this.models.forEach((info) => {
      if (!providers.has(info.provider)) {
        providers.set(info.provider, []);
      }

      providers.get(info.provider)!.push({
        name: info.id,
        isToolCallUnsupported: !info.supportsToolCalling,
      });
    });

    return Array.from(providers.entries()).map(([provider, models]) => ({
      provider,
      models,
    }));
  }

  /**
   * Get the default model ID
   */
  get defaultModel(): string {
    return this.defaultModelId;
  }
}

export const modelRegistry = new ModelRegistry();

// Make the old format available for backward compatibility
export const allModels = modelRegistry.getAllModelsGroupedByProvider();
export const DEFAULT_MODEL = modelRegistry.defaultModel;

export const isToolCallUnsupportedModel = (model: LanguageModel): boolean => {
  return Array.from(modelRegistry.models.values())
    .filter((info) => !info.supportsToolCalling)
    .some((info) => info.model === model);
};

// Keep the same API signature for backwards compatibility
export const customModelProvider = {
  modelsInfo: modelRegistry.getModelsInfo(),
  getModel: modelRegistry.getModel.bind(modelRegistry),
};
