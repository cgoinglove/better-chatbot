import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import { ollama } from "ollama-ai-provider";
import { env, logEnvStatus } from "../env";

// Log environment variables status for debugging
if (typeof window === "undefined") {
  // Only log on server-side
  logEnvStatus();
}

// Create OpenRouter provider with API key from our env helper
const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
  // Use strict compatibility mode for OpenRouter API
  compatibility: "strict",
});

export const allModels = {
  openai: {
    "4o-mini": openai("gpt-4o-mini", {}),
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "4o": openai("gpt-4o"),
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
    "gemma3:4b": ollama("gemma3:4b", {
      simulateStreaming: true,
    }),
    "gemma3:12b": ollama("gemma3:12b"),
  },
  openrouter: {
    "google/gemini-2.5-pro-exp-03-25:free": openrouter.chat(
      "google/gemini-2.5-pro-exp-03-25:free",
    ),
    "google/gemini-2.0-flash-exp:free": openrouter.chat(
      "google/gemini-2.0-flash-exp:free",
    ),
    "deepseek/deepseek-r1-zero:free": openrouter.chat(
      "deepseek/deepseek-r1-zero:free",
    ),
    "mistralai/mistral-7b-instruct:free": openrouter.chat(
      "mistralai/mistral-7b-instruct:free",
    ),
    "mistralai/mistral-small-3.1-24b-instruct:free": openrouter.chat(
      "mistralai/mistral-small-3.1-24b-instruct:free",
    ),
  },
} as const;

export const isToolCallUnsupported = (model: LanguageModel) => {
  return [
    // Fix potential typo in model name
    allModels.openai["4o-mini"],
    allModels.google["gemini-2.0-thinking"],
    allModels.xai["grok-3"],
    allModels.xai["grok-3-mini"],
    allModels.ollama["gemma3:1b"],
    allModels.ollama["gemma3:4b"],
    allModels.ollama["gemma3:12b"],
    // Add OpenRouter models
    allModels.openrouter["deepseek/deepseek-r1-zero:free"],
  ].includes(model);
};

<<<<<<< Updated upstream
<<<<<<< Updated upstream
export const DEFAULT_MODEL = "gpt-4.1-mini";
=======
export const DEFAULT_MODEL = "claude-3-5-sonnet";
>>>>>>> Stashed changes
=======
export const DEFAULT_MODEL = "claude-3-5-sonnet";
>>>>>>> Stashed changes

const fallbackModel = allModels.anthropic["claude-3-5-sonnet"];

export const customModelProvider = {
  modelsInfo: Object.keys(allModels).map((provider) => {
    return {
      provider,
      models: Object.keys(allModels[provider]).map((name) => {
        return {
          name,
          isToolCallUnsupported: isToolCallUnsupported(
            allModels[provider][name],
          ),
        };
      }),
    };
  }),
  getModel: (model?: string): LanguageModel => {
    try {
      // If model is undefined or empty, return fallback model
      if (!model) {
        console.log("No model specified, using fallback model:", DEFAULT_MODEL);
        return fallbackModel;
      }

      // Find the provider that has this model
      const provider = Object.keys(allModels).find((provider) =>
        Object.keys(allModels[provider]).includes(model),
      );

      if (!provider) {
        console.log(
          `Model "${model}" not found, using fallback model:`,
          DEFAULT_MODEL,
        );
        return fallbackModel;
      }

      // Return the requested model
      return allModels[provider][model];
    } catch (error) {
      console.error("Error getting model:", error);
      return fallbackModel;
    }
  },
};
