import { z } from "zod";

// Define the schema for a single AI model that is compatible with OpenAI's API structure.
const OpenAICompatibleModelSchema = z.object({
  apiName: z.string().describe("The internal API name for the model."),
  uiName: z.string().describe("The user-friendly name for the model."),
  // Whether the model supports external tools/function calling, specifically for multi-cloud platform (MCP) servers.
  supportsTools: z
    .boolean()
    .describe(
      "Indicates if the model supports external tools/function calling for multi-cloud platform (MCP) servers.",
    ),
});

// Define the schema for a provider that is compatible with OpenAI's API structure,
// which includes a list of its OpenAI-compatible models.
const OpenAICompatibleProviderSchema = z.object({
  provider: z
    .string()
    .describe(
      "The name of the AI provider (e.g., 'groq', 'OpenAI', 'Google').",
    ),
  models: z
    .array(OpenAICompatibleModelSchema)
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

// Infer the type for a single OpenAI-compatible provider.
export type OpenAICompatibleProvider = z.infer<
  typeof OpenAICompatibleProviderSchema
>;

// Define the schema for a list of all AI providers and their models that are OpenAI compatible.
export const OpenAICompatibleProvidersListSchema = z
  .array(OpenAICompatibleProviderSchema)
  .describe("A list of all AI providers and their models.");

// If you still need a base type for the list, you can define it like this:
export type BaseOpenAICompatibleProvidersList = z.infer<
  typeof OpenAICompatibleProvidersListSchema
>;
