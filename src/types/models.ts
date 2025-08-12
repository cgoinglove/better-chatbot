import { z } from "zod";

// API key environment variable mapping

const PROVIDER_TYPES = [
  "openai",
  "google",
  "anthropic",
  "xai",
  "openrouter",
  "ollama",
  "openai-compatible",
  "azure-openai",
] as const;

type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_SETTINGS: Partial<
  Record<
    ProviderType,
    {
      apiKeyEnvVar?: string;
      baseURL?: string;
      realtimeBaseURL?: string;
    }
  >
> = {
  openai: {
    apiKeyEnvVar: "OPENAI_API_KEY",
    baseURL: "https://api.openai.com/v1",
    realtimeBaseURL: "https://api.openai.com/v1/realtime",
  },
  google: {
    apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
  },
  anthropic: {
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    baseURL: "https://api.anthropic.com/v1",
  },
  xai: {
    apiKeyEnvVar: "XAI_API_KEY",
    baseURL: "https://api.x.ai/v1",
  },
  openrouter: {
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
  },
  ollama: {
    apiKeyEnvVar: "OLLAMA_API_KEY",
    baseURL: "http://localhost:11434/api",
  },
  "azure-openai": {
    apiKeyEnvVar: "AZURE_API_KEY",
    baseURL: "https://api.openai.com/v1",
  },
};

function setDefaults<T extends BaseProvider>(provider: T): T {
  const settings = PROVIDER_SETTINGS[provider.type as ProviderType];
  const defaultApiKeyEnvVar = settings?.apiKeyEnvVar;
  const idBasedApiKeyEnvVar = `${provider.id.toUpperCase().replace(/-/g, "_")}_API_KEY`;

  // Try ID-based first (specific), then default (shared), then fail
  let apiKeyEnvVar: string;
  if (process.env[idBasedApiKeyEnvVar]) {
    apiKeyEnvVar = idBasedApiKeyEnvVar;
  } else if (defaultApiKeyEnvVar && process.env[defaultApiKeyEnvVar]) {
    apiKeyEnvVar = defaultApiKeyEnvVar;
  } else {
    // Use default for error message, or ID-based if no default exists
    apiKeyEnvVar = defaultApiKeyEnvVar || idBasedApiKeyEnvVar;
  }

  const { baseURL, realtimeBaseURL } = settings ?? {};

  if (provider.requireApiKey && !process.env[apiKeyEnvVar]) {
    throw new Error(`${apiKeyEnvVar} environment variable is required`);
  }

  // Ensure providerSettings exists
  if (!provider.providerSettings) {
    provider.providerSettings = {} as T["providerSettings"];
  }

  // Set defaults (preserve existing settings and their types)
  const updatedSettings = {
    ...provider.providerSettings,
    ...(baseURL && !provider.providerSettings.baseURL ? { baseURL } : {}),
    ...(realtimeBaseURL && !provider.providerSettings.realtimeBaseURL
      ? { realtimeBaseURL }
      : {}),
  } as T["providerSettings"];

  // Add API key from environment
  if (provider.providerSettings.apiKey !== undefined) {
    throw new Error(
      `API keys must not be set in config files. Use ${apiKeyEnvVar} environment variable instead.`,
    );
  }

  const envValue = process.env[apiKeyEnvVar];
  updatedSettings.apiKey = envValue;

  return {
    ...provider,
    providerSettings: updatedSettings,
  } as T;
}

// Base Model Settings for All Models

export const BaseModelSettingsSchema = z.object({
  // Core AI SDK settings
  maxOutputTokens: z.number().positive().optional(),
  temperature: z.number().min(0).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().positive().optional(),
  presencePenalty: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  stopSequences: z.array(z.string()).optional(),
  seed: z.number().int().optional(),
  maxRetries: z.number().int().min(0).optional(),
});

export const BaseModelSchema = z.object({
  uiName: z.string().min(1),
  apiName: z.string().min(1),
  description: z.string().optional(),
  supportsTools: z.boolean().default(true),
  supportsVoice: z.boolean().default(false),
  settings: BaseModelSettingsSchema.optional().default({}),
});

// Base Settings for All Providers
export const BaseProviderSettingsSchema = z.object({
  baseURL: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  realtimeBaseURL: z.string().url().optional(),
  apiKey: z.string().optional(),
});

const BaseProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(PROVIDER_TYPES),
  description: z.string().optional(),
  requireApiKey: z.boolean().default(true),
  providerSettings: BaseProviderSettingsSchema.optional().default({}),
  models: z.array(BaseModelSchema).default([]),
});

// OpenAI Provider & Model Settings

export const OpenAIModelSchema = BaseModelSchema.extend({
  settings: BaseModelSettingsSchema.extend({
    // OpenAI-specific settings
    logitBias: z.record(z.number()).optional(),
    logprobs: z.union([z.boolean(), z.number()]).optional(),
    parallelToolCalls: z.boolean().optional(),
    user: z.string().optional(),
    reasoningEffort: z.enum(["low", "medium", "high"]).optional(),
    structuredOutputs: z.boolean().optional(),
    maxCompletionTokens: z.number().optional(),
    store: z.boolean().optional(),
    metadata: z.record(z.string()).optional(),
    serviceTier: z.enum(["auto", "flex"]).optional(),
    prediction: z.record(z.any()).optional(),
    strictJsonSchema: z.boolean().optional(),
    imageDetail: z.enum(["low", "high", "auto"]).optional(),
    echo: z.boolean().optional(),
    suffix: z.string().optional(),
    dimensions: z.number().optional(),
    voice: z
      .enum([
        "alloy",
        "ballad",
        "sage",
        "shimmer",
        "verse",
        "echo",
        "coral",
        "ash",
      ])
      .optional(),
    inputAudioTranscription: z
      .object({
        model: z.string().optional().default("whisper-1"),
      })
      .optional(),
  })
    .optional()
    .default({}),
});

// Unified OpenAI Provider Settings Schema
export const OpenAIProviderSettingsSchema = BaseProviderSettingsSchema.extend({
  baseURL: z.string().url().optional(),
  project: z.string().optional(),
  organization: z.string().optional(),
  compatibility: z.enum(["strict", "compatible"]).optional(),
  name: z.string().optional(),
});

export const OpenAIProviderSchema = BaseProviderSchema.extend({
  type: z.literal("openai"),
  id: z.string(), // Allow custom IDs
  providerSettings: OpenAIProviderSettingsSchema.optional().default({}),
  models: z.array(OpenAIModelSchema).default([]),
}).transform((data) => {
  return setDefaults(data);
});

// Google Provider & Model Settings

export const GoogleSafetySettingSchema = z.object({
  category: z.enum([
    "HARM_CATEGORY_HATE_SPEECH",
    "HARM_CATEGORY_DANGEROUS_CONTENT",
    "HARM_CATEGORY_HARASSMENT",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  ]),
  threshold: z.enum([
    "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
    "BLOCK_LOW_AND_ABOVE",
    "BLOCK_MEDIUM_AND_ABOVE",
    "BLOCK_ONLY_HIGH",
    "BLOCK_NONE",
  ]),
});

export const GoogleModelSchema = BaseModelSchema.extend({
  settings: BaseModelSettingsSchema.extend({
    // Google-specific settings
    cachedContent: z.string().optional(),
    structuredOutputs: z.boolean().optional(),
    safetySettings: z.array(GoogleSafetySettingSchema).optional(),
    responseModalities: z.array(z.enum(["TEXT", "IMAGE"])).optional(),
    thinkingConfig: z
      .object({
        thinkingBudget: z.number().optional(),
        includeThoughts: z.boolean().optional(),
      })
      .optional(),
    outputDimensionality: z.number().optional(),
    taskType: z
      .enum([
        "RETRIEVAL_QUERY",
        "RETRIEVAL_DOCUMENT",
        "SEMANTIC_SIMILARITY",
        "CLASSIFICATION",
        "CLUSTERING",
      ])
      .optional(),
    personGeneration: z
      .enum(["DONT_ALLOW", "ALLOW_ADULT", "ALLOW_ALL"])
      .optional(),
  })
    .optional()
    .default({}),
});

export const GoogleProviderSchema = BaseProviderSchema.extend({
  type: z.literal("google"),
  id: z.string(), // Allow custom IDs
  providerSettings: BaseProviderSettingsSchema.optional().default({}),
  models: z.array(GoogleModelSchema).default([]),
}).transform((data) => {
  return setDefaults(data);
});

// Anthropic Provider & Model Settings

export const AnthropicModelSchema = BaseModelSchema.extend({
  settings: BaseModelSettingsSchema.extend({
    // Anthropic-specific settings
    sendReasoning: z.boolean().optional(),
    thinking: z
      .object({
        thinkingBudget: z.number().optional(),
      })
      .optional(),
    providerOptions: z
      .object({
        anthropic: z
          .object({
            cacheControl: z
              .object({
                type: z.literal("ephemeral"),
                ttl: z.string().optional(), // e.g., '1h' for beta longer cache
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
    .optional()
    .default({}),
});

export const AnthropicProviderSchema = BaseProviderSchema.extend({
  type: z.literal("anthropic"),
  id: z.string(), // Allow custom IDs
  providerSettings: BaseProviderSettingsSchema.optional().default({}),
  models: z.array(AnthropicModelSchema).default([]),
}).transform((data) => {
  return setDefaults(data);
});

// XAI Provider & Model Settings

export const XAIModelSchema = BaseModelSchema.extend({
  settings: BaseModelSettingsSchema.optional().default({}),
});

export const XAIProviderSchema = BaseProviderSchema.extend({
  type: z.literal("xai"),
  id: z.string(), // Allow custom IDs
  providerSettings: BaseProviderSettingsSchema.optional().default({}),
  models: z.array(XAIModelSchema).default([]),
}).transform((data) => {
  return setDefaults(data);
});

// OpenRouter Provider & Model Settings

export const OpenRouterModelSchema = BaseModelSchema.extend({
  settings: BaseModelSettingsSchema.optional().default({}),
});

export const OpenRouterProviderSchema = BaseProviderSchema.extend({
  type: z.literal("openrouter"),
  id: z.string(), // Allow custom IDs
  providerSettings: BaseProviderSettingsSchema.optional().default({}),
  models: z.array(OpenRouterModelSchema).default([]),
}).transform((data) => {
  return setDefaults(data);
});

export const OllamaModelSettingsSchema = BaseModelSettingsSchema.extend({
  experimentalStreamTools: z.boolean().optional(),
  f16Kv: z.boolean().optional(),
  lowVram: z.boolean().optional(),
  mainGpu: z.number().optional(),
  minP: z.number().optional(),
  mirostat: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  mirostatEta: z.number().optional(),
  mirostatTau: z.number().optional(),
  numa: z.boolean().optional(),
  numBatch: z.number().optional(),
  numCtx: z.number().optional(),
  numGpu: z.number().optional(),
  numKeep: z.number().optional(),
  numPredict: z.number().optional(),
  vocabOnly: z.boolean().optional(),
});

export const OllamaModelSchema = BaseModelSchema.extend({
  settings: OllamaModelSettingsSchema.optional().default({}),
});

export const OllamaProviderSchema = BaseProviderSchema.extend({
  type: z.literal("ollama"),
  id: z.string(), // Allow custom IDs
  providerSettings: BaseProviderSettingsSchema.optional().default({}),
  models: z.array(OllamaModelSchema).default([]),
}).transform((data) => {
  return setDefaults(data);
});

// OpenAI Compatible Provider & Model Settings

export const OpenAICompatibleModelSchema = OpenAIModelSchema;

export const OpenAICompatibleProviderSchema = BaseProviderSchema.extend({
  type: z.literal("openai-compatible"),
  providerSettings: BaseProviderSettingsSchema.extend({
    name: z.string(),
    baseURL: z.string().url(),
  }),
  models: z.array(OpenAICompatibleModelSchema).default([]),
}).transform((data) => {
  return setDefaults(data);
});

// Azure Provider & Model Settings

export const AzureOpenAIModelSchema = OpenAIModelSchema;

export const AzureOpenAIProviderSchema = BaseProviderSchema.extend({
  type: z.literal("azure-openai"),
  providerSettings: BaseProviderSettingsSchema.optional().default({}),
  models: z.array(AzureOpenAIModelSchema).default([]),
}).transform((data) => {
  return setDefaults(data);
});

export const ProviderConfigSchema = z.union([
  OpenAIProviderSchema,
  GoogleProviderSchema,
  AnthropicProviderSchema,
  XAIProviderSchema,
  OpenRouterProviderSchema,
  OllamaProviderSchema,
  OpenAICompatibleProviderSchema,
  AzureOpenAIProviderSchema,
]);

export const UnifiedProviderConfigSchema = z.object({
  providers: z.array(ProviderConfigSchema),
});

export const ProviderConfigSchemaArray = z.array(ProviderConfigSchema);

// Legacy aliases for backwards compatibility
export const ProviderJsonConfigSchema = ProviderConfigSchema;
export const UnifiedJsonModelConfigSchema = UnifiedProviderConfigSchema;

export type BaseProvider = z.infer<typeof BaseProviderSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type UnifiedProviderConfig = z.infer<typeof UnifiedProviderConfigSchema>;

// Model-specific types
export type OpenAIModel = z.infer<typeof OpenAIModelSchema>;
export type GoogleModel = z.infer<typeof GoogleModelSchema>;
export type AnthropicModel = z.infer<typeof AnthropicModelSchema>;
export type XAIModel = z.infer<typeof XAIModelSchema>;
export type OpenRouterModel = z.infer<typeof OpenRouterModelSchema>;
export type OllamaModel = z.infer<typeof OllamaModelSchema>;
export type OpenAICompatibleModel = z.infer<typeof OpenAICompatibleModelSchema>;
export type AzureOpenAIModel = z.infer<typeof AzureOpenAIModelSchema>;

// Runtime Provider Config types (with API keys) - these are our config types, not SDK types
export type OpenAIProviderConfig = z.infer<typeof OpenAIProviderSchema>;
export type GoogleProviderConfig = z.infer<typeof GoogleProviderSchema>;
export type AnthropicProviderConfig = z.infer<typeof AnthropicProviderSchema>;
export type XAIProviderConfig = z.infer<typeof XAIProviderSchema>;
export type OpenRouterProviderConfig = z.infer<typeof OpenRouterProviderSchema>;
export type OllamaProviderConfig = z.infer<typeof OllamaProviderSchema>;
export type OpenAICompatibleProviderConfig = z.infer<
  typeof OpenAICompatibleProviderSchema
>;
export type AzureOpenAIProviderConfig = z.infer<
  typeof AzureOpenAIProviderSchema
>;
