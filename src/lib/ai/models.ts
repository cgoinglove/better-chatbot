import "server-only";

import { createOllama } from "ollama-ai-provider-v2";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { LanguageModel } from "ai";
import { cache } from "react";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});
const groq = createGroq({
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// Fetch all models from OpenRouter at runtime (server-only) with memoized cache
type OpenRouterModelResp = {
  id: string;
};

const fetchAllOpenRouterModels = cache(async () => {
  try {
    if (!process.env.OPENROUTER_API_KEY)
      return {} as Record<string, LanguageModel>;
    const resp = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      // 30s cache at edge/runtime level if supported
      next: { revalidate: 1800 },
    });
    if (!resp.ok) return {} as Record<string, LanguageModel>;
    const json = (await resp.json()) as { data?: OpenRouterModelResp[] };
    const models = json.data ?? [];
    const entries = Object.fromEntries(
      models.map((m) => [m.id, openrouter(m.id)]),
    );
    return entries as Record<string, LanguageModel>;
  } catch {
    return {} as Record<string, LanguageModel>;
  }
});

const staticModels = {
  openai: {
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "o4-mini": openai("o4-mini"),
    o3: openai("o3"),
    "gpt-5": openai("gpt-5"),
    "gpt-5-mini": openai("gpt-5-mini"),
    "gpt-5-nano": openai("gpt-5-nano"),
  },
  google: {
    "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
    "gemini-2.5-flash": google("gemini-2.5-flash"),
    "gemini-2.5-pro": google("gemini-2.5-pro"),
  },
  anthropic: {
    "claude-4-sonnet": anthropic("claude-4-sonnet-20250514"),
    "claude-4-opus": anthropic("claude-4-opus-20250514"),
    "claude-3-7-sonnet": anthropic("claude-3-7-sonnet-20250219"),
  },
  xai: {
    "grok-4": xai("grok-4"),
    "grok-3": xai("grok-3"),
    "grok-3-mini": xai("grok-3-mini"),
  },
  ollama: {
    "gemma3:1b": ollama("gemma3:1b"),
    "gemma3:4b": ollama("gemma3:4b"),
    "gemma3:12b": ollama("gemma3:12b"),
  },
  groq: {
    "kimi-k2-instruct": groq("moonshotai/kimi-k2-instruct"),
    "llama-4-scout-17b": groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    "gpt-oss-20b": groq("openai/gpt-oss-20b"),
    "gpt-oss-120b": groq("openai/gpt-oss-120b"),
    "qwen3-32b": groq("qwen/qwen3-32b"),
  },
  openRouter: {},
};

const staticUnsupportedModels = new Set([
  staticModels.openai["o4-mini"],
  staticModels.ollama["gemma3:1b"],
  staticModels.ollama["gemma3:4b"],
  staticModels.ollama["gemma3:12b"],
  staticModels.openRouter["gpt-oss-20b:free"],
  staticModels.openRouter["qwen3-8b:free"],
  staticModels.openRouter["qwen3-14b:free"],
  staticModels.openRouter["deepseek-r1:free"],
  staticModels.openRouter["gemini-2.0-flash-exp:free"],
]);

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

// Merge static providers with dynamic OpenRouter models
const allModelsPromise = (async () => {
  const openrouterDynamic = await fetchAllOpenRouterModels();
  return {
    ...openaiCompatibleModels,
    ...staticModels,
    openRouter: {
      ...openrouterDynamic,
    },
  } as typeof staticModels & Record<string, Record<string, LanguageModel>>;
})();

const allUnsupportedModels = new Set([
  ...openaiCompatibleUnsupportedModels,
  ...staticUnsupportedModels,
]);

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};

const fallbackModel = staticModels.openai["gpt-4.1"];

export const customModelProvider = {
  // Note: modelsInfo is async now because OpenRouter models are fetched at runtime
  modelsInfo: (async () => {
    const allModels = await allModelsPromise;
    return Object.entries(allModels).map(([provider, models]) => ({
      provider,
      models: Object.entries(models).map(([name, model]) => ({
        name,
        isToolCallUnsupported: isToolCallUnsupportedModel(model),
      })),
      hasAPIKey: checkProviderAPIKey(provider as keyof typeof staticModels),
    }));
  })(),
  getModel: (model?: ChatModel): LanguageModel => {
    // Synchronous getModel: best-effort using fallback for first render; dynamic models become available on next request
    // This keeps API stable for existing callers.
    if (!model) return fallbackModel;
    // We cannot await here; try static first
    const maybeAllModels = (global as any).__ALL_MODELS_CACHE as
      | (typeof staticModels & Record<string, Record<string, LanguageModel>>)
      | undefined;
    const staticPick = (staticModels as any)[model.provider]?.[model.model];
    if (staticPick) return staticPick;
    const dynamicPick = maybeAllModels?.[model.provider]?.[model.model];
    return dynamicPick || fallbackModel;
  },
};

// Populate global cache once per process to support synchronous getModel lookups
(async () => {
  try {
    (global as any).__ALL_MODELS_CACHE = await allModelsPromise;
  } catch {}
})();

function checkProviderAPIKey(provider: keyof typeof staticModels) {
  let key: string | undefined;
  switch (provider) {
    case "openai":
      key = process.env.OPENAI_API_KEY;
      break;
    case "google":
      key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      break;
    case "anthropic":
      key = process.env.ANTHROPIC_API_KEY;
      break;
    case "xai":
      key = process.env.XAI_API_KEY;
      break;
    case "ollama":
      key = process.env.OLLAMA_API_KEY;
      break;
    case "groq":
      key = process.env.GROQ_API_KEY;
      break;
    case "openRouter":
      key = process.env.OPENROUTER_API_KEY;
      break;
    default:
      return true; // assume the provider has an API key
  }
  return !!key && key != "****";
}
