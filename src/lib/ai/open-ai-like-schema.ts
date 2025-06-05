import { z } from "zod";

// Define the schema for a single AI model
const ModelSchema = z.object({
  apiName: z.string().describe("The internal API name for the model."),
  uiName: z.string().describe("The user-friendly name for the model."),
  // Whether the model supports external tools/function calling, specifically for MCP servers.
  supportsTools: z
    .boolean()
    .describe(
      "Indicates if the model supports external tools/function calling for multi-cloud platform (MCP) servers.",
    ),
});

// Define the schema for a provider, which includes a list of its models
const ProviderSchema = z.object({
  provider: z
    .string()
    .describe(
      "The name of the AI provider (e.g., 'groq', 'OpenAI', 'Google').",
    ),
  models: z
    .array(ModelSchema)
    .describe("A list of AI models offered by this provider."),
  // The environment variable name for the provider's API key. Stored in .env.
  apiKeyEnvVar: z
    .string()
    .describe(
      "The name of the environment variable (e.g., 'OPENAI_API_KEY') for the provider's API key. This key should be stored in a .env file.",
    ),
  // The base URL for the provider's API. Defaults to the provider's default API endpoint. Should be OpenAI-like.
  baseUrl: z
    .string()
    .url()
    .optional()
    .describe(
      "The base URL for the provider's API. Defaults to the provider's official endpoint. Should typically follow an OpenAI-like structure (e.g., ending with '/v1').",
    ),
});

export const ProvidersListSchema = z
  .array(ProviderSchema)
  .describe("A list of all AI providers and their models.");

export type BaseProvidersList = z.infer<typeof ProvidersListSchema>;
