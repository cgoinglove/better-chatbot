// models.ts
import { createOllama } from "ollama-ai-provider";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});

const staticModels = {
  openai: {
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "4o": openai("gpt-4o"),
    "4o-mini": openai("gpt-4o-mini"),
    "o4-mini": openai("o4-mini", {
      reasoningEffort: "medium",
    }),
  },
  google: {
    "gemini-2.0-flash-lite": google("gemini-2.0-flash-lite"),
    "gemini-2.5-flash": google("gemini-2.5-flash", {}),
    "gemini-2.5-pro": google("gemini-2.5-pro"),
  },
  anthropic: {
    "claude-4-sonnet": anthropic("claude-4-sonnet-20250514"),
    "claude-4-opus": anthropic("claude-4-opus-20250514"),
    "claude-3-7-sonnet": anthropic("claude-3-7-sonnet-latest"),
  },
  xai: {
    "grok-3": xai("grok-3-latest"),
    "grok-3-mini": xai("grok-3-mini-latest"),
  },
  ollama: {
    "gemma3:1b": ollama("gemma3:1b"),
    "gemma3:4b": ollama("gemma3:4b"),
    "gemma3:12b": ollama("gemma3:12b"),
  },
  openRouter: {
    "qwen3-8b:free": openrouter("qwen/qwen3-8b:free"),
    "qwen3-14b:free": openrouter("qwen/qwen3-14b:free"),
  },
};

const staticUnsupportedModels = new Set([
  staticModels.openai["o4-mini"],
  staticModels.google["gemini-2.0-flash-lite"],
  staticModels.ollama["gemma3:1b"],
  staticModels.ollama["gemma3:4b"],
  staticModels.ollama["gemma3:12b"],
  staticModels.openRouter["qwen3-8b:free"],
  staticModels.openRouter["qwen3-14b:free"],
]);

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

const allModels = { ...openaiCompatibleModels, ...staticModels };

const allUnsupportedModels = new Set([
  ...openaiCompatibleUnsupportedModels,
  ...staticUnsupportedModels,
]);

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};

const firstProvider = Object.keys(allModels)[0];
const firstModel = Object.keys(allModels[firstProvider])[0];

const fallbackModel = allModels[firstProvider][firstModel];

export const customModelProvider = {
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      isToolCallUnsupported: isToolCallUnsupportedModel(model),
    })),
  })),
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) return fallbackModel;
    return allModels[model.provider]?.[model.model] || fallbackModel;
  },
};
