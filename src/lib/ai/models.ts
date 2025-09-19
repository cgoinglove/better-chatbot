import "server-only";

import { createOllama } from "ollama-ai-provider-v2";
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

const has = (v: string | undefined | null) =>
  typeof v === "string" && v.trim().length > 0;

// Provider presence flags
const HAS_OPENAI = has(process.env.OPENAI_API_KEY);
const HAS_GOOGLE = has(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const HAS_ANTHROPIC = has(process.env.ANTHROPIC_API_KEY);
const HAS_XAI = has(process.env.XAI_API_KEY);
const HAS_OPENROUTER = has(process.env.OPENROUTER_API_KEY);
const HAS_OLLAMA = has(process.env.OLLAMA_BASE_URL); // default local URL supported

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});

// Build static models conditionally per provider
const conditionalStaticModels: Record<
  string,
  Record<string, LanguageModel>
> = {};

// OpenAI models
if (HAS_OPENAI) {
  conditionalStaticModels.openai = {
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "o4-mini": openai("o4-mini"),
    o3: openai("o3"),
    "gpt-5": openai("gpt-5"),
    "gpt-5-mini": openai("gpt-5-mini"),
    "gpt-5-nano": openai("gpt-5-nano"),
  };
}

// Google models
if (HAS_GOOGLE) {
  conditionalStaticModels.google = {
    "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
    "gemini-2.5-flash": google("gemini-2.5-flash"),
    "gemini-2.5-pro": google("gemini-2.5-pro"),
  };
}

// Anthropic models
if (HAS_ANTHROPIC) {
  conditionalStaticModels.anthropic = {
    "claude-4-sonnet": anthropic("claude-4-sonnet-20250514"),
    "claude-4-opus": anthropic("claude-4-opus-20250514"),
    "claude-3-7-sonnet": anthropic("claude-3-7-sonnet-20250219"),
  };
}

// xAI models
if (HAS_XAI) {
  conditionalStaticModels.xai = {
    "grok-4": xai("grok-4"),
    "grok-3": xai("grok-3"),
    "grok-3-mini": xai("grok-3-mini"),
  };
}

// Ollama models (local)
if (HAS_OLLAMA) {
  conditionalStaticModels.ollama = {
    "gemma3:1b": ollama("gemma3:1b"),
    "gemma3:4b": ollama("gemma3:4b"),
    "gemma3:12b": ollama("gemma3:12b"),
  };
}

// OpenRouter models (requires OPENROUTER_API_KEY configured in provider setup)
if (HAS_OPENROUTER) {
  conditionalStaticModels.openRouter = {
    "gpt-oss-20b:free": openrouter("openai/gpt-oss-20b:free"),
    "qwen3-8b:free": openrouter("qwen/qwen3-8b:free"),
    "qwen3-14b:free": openrouter("qwen/qwen3-14b:free"),
    "qwen3-coder:free": openrouter("qwen/qwen3-coder:free"),
    "deepseek-r1:free": openrouter("deepseek/deepseek-r1-0528:free"),
    "deepseek-v3:free": openrouter("deepseek/deepseek-chat-v3-0324:free"),
    "gemini-2.0-flash-exp:free": openrouter("google/gemini-2.0-flash-exp:free"),
  };
}

const staticUnsupportedModels = new Set<LanguageModel>(
  [
    conditionalStaticModels.openai?.["o4-mini"],
    conditionalStaticModels.ollama?.["gemma3:1b"],
    conditionalStaticModels.ollama?.["gemma3:4b"],
    conditionalStaticModels.ollama?.["gemma3:12b"],
    conditionalStaticModels.openRouter?.["gpt-oss-20b:free"],
    conditionalStaticModels.openRouter?.["qwen3-8b:free"],
    conditionalStaticModels.openRouter?.["qwen3-14b:free"],
    conditionalStaticModels.openRouter?.["deepseek-r1:free"],
    conditionalStaticModels.openRouter?.["gemini-2.0-flash-exp:free"],
  ].filter((model): model is LanguageModel => model != null),
);

// OpenAI-compatible dynamic providers
const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

// Merge all models
const allModels: Record<string, Record<string, LanguageModel>> = {
  ...openaiCompatibleModels,
  ...conditionalStaticModels,
};

// Merge unsupported sets
const allUnsupportedModels = new Set<LanguageModel>([
  ...openaiCompatibleUnsupportedModels,
  ...staticUnsupportedModels,
]);

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};

// Helper: resolve fallback from env E2E_DEFAULT_MODEL or first available
const resolveFallback = (): LanguageModel => {
  // If user specified default in env as "provider/model"
  const configuredDefault = (process.env.E2E_DEFAULT_MODEL || "").trim();
  if (configuredDefault.includes("/")) {
    const [provider, model] = configuredDefault.split("/", 2);
    const found = allModels?.[provider]?.[model];
    if (found) return found;
  }

  // Prefer OpenAI if present
  if (conditionalStaticModels.openai?.["gpt-4.1"]) {
    return conditionalStaticModels.openai["gpt-4.1"];
  }

  // Otherwise take the first model in any available provider
  for (const provider of Object.keys(allModels)) {
    const entries = Object.values(allModels[provider] || {});
    if (entries.length > 0) return entries[0];
  }

  throw new Error(
    "No models are available. Please configure at least one provider in the environment.",
  );
};

const fallbackModel = resolveFallback();

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
