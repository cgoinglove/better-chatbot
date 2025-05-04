import { ollama } from "ollama-ai-provider";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { LanguageModel, wrapLanguageModel } from "ai";
import { gemmaToolMiddleware } from "@ai-sdk-tool/parser";
import { getAllCustomProviderModels } from "./custom-providers";

/**
 * Define base models that are always available regardless of configuration
 * These models form the core of the available AI models in the application
 */
const baseModels = {
  openai: {
    "4o-mini": openai("gpt-4o-mini", {}),
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "4o": openai("gpt-4o"),
    "o4-mini": openai("o4-mini", {
      reasoningEffort: "medium",
    }),
  },
  google: {
    "gemini-2.0": google("gemini-2.0-flash-exp"),
    "gemini-2.0-thinking": google("gemini-2.0-flash-exp"),
    "gemini-2.5-pro": google("gemini-2.5-pro-exp-03-25"),
  },
  anthropic: {
    "claude-3-5-sonnet": anthropic("claude-3-5-sonnet-latest"),
    "claude-3-7-sonnet": anthropic("claude-3-7-sonnet-latest"),
  },
  xai: {
    "grok-2": xai("grok-2-1212"),
    "grok-3-mini": xai("grok-3-mini-beta"),
    "grok-3": xai("grok-3-beta"),
  },
  ollama: {
    "gemma3:1b": ollama("gemma3:1b"),
    "gemma3:4b": wrapLanguageModel({
      model: ollama("gemma3:4b", {
        simulateStreaming: true,
      }),
      middleware: gemmaToolMiddleware,
    }),
    "gemma3:12b": wrapLanguageModel({
      model: ollama("gemma3:12b"),
      middleware: gemmaToolMiddleware,
    }),
  },
  // Include all custom OpenAI-compatible providers (including OpenRouter)
  ...getAllCustomProviderModels(),
};

/**
 * Export all models without conditional loading
 *
 * Ensure all models are visible in the UI. Models will appear in the dropdown even if
 * their respective API keys are not set, but will fail gracefully at runtime.
 *
 * To use custom provider models (including OpenRouter):
 * 1. Set the appropriate API key environment variable
 * 2. Configure models through environment variables
 * 3. See README.md for detailed configuration instructions
 */
export const allModels = baseModels;

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return [
    allModels.openai["o4-mini"],
    allModels.google["gemini-2.0-thinking"],
    allModels.xai["grok-3"],
    allModels.xai["grok-3-mini"],
    allModels.google["gemini-2.0-thinking"],
    allModels.ollama["gemma3:1b"],
  ].includes(model);
};

export const DEFAULT_MODEL = "gpt-4.1-mini";

const fallbackModel = allModels.openai[DEFAULT_MODEL];

export const customModelProvider = {
  modelsInfo: Object.keys(allModels).map((provider) => {
    return {
      provider,
      models: Object.keys(allModels[provider]).map((name) => {
        return {
          name,
          isToolCallUnsupported: isToolCallUnsupportedModel(
            allModels[provider][name],
          ),
        };
      }),
    };
  }),
  getModel: (model?: string): LanguageModel => {
    return (Object.values(allModels).find((models) => {
      return models[model!];
    })?.[model!] ?? fallbackModel) as LanguageModel;
  },
};