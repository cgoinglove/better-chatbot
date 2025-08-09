#!/usr/bin/env tsx

import { zodToJsonSchema } from "zod-to-json-schema";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { UnifiedJsonModelConfigSchema } from "../src/types/models";

// Generate JSON Schema from Zod schema
const jsonSchema = zodToJsonSchema(UnifiedJsonModelConfigSchema, {
  name: "ModelConfiguration",
  $refStrategy: "none", // Inline all references for better IDE support
});

// Add helpful documentation to the schema
function enhanceSchemaWithDocumentation(schema: any) {
  // Add top-level documentation
  schema.title = "Better Chatbot Model Configuration";
  schema.description =
    "Configuration file for AI model providers and their models. API keys should be set via environment variables, not in this file.";

  // Add comment fields to top-level schema
  schema.properties = schema.properties || {};
  schema.properties._comment = {
    type: "string",
    description: "Comments for Developers",
  };
  schema.properties._description = {
    type: "string",
    description: "End user description of the model",
  };
  schema.properties._documentation = {
    type: "string",
    description: "Link to documentation",
  };
  schema.properties._note = { type: "string", description: "Additional notes" };

  // Add documentation to providers array
  if (schema.properties?.providers) {
    schema.properties.providers.description =
      "List of AI provider configurations. Each provider requires specific environment variable corresponding to the API key.";

    // Add documentation to provider items
    const providerItems = schema.properties.providers.items?.anyOf || [];
    providerItems.forEach((provider: any) => {
      if (provider.properties) {
        // Add provider-level documentation
        if (provider.properties.type?.const) {
          const providerType = provider.properties.type.const;
          provider.description = getProviderDescription(providerType);
        }

        // Add comment fields to provider
        provider.properties._comment = {
          type: "string",
          description: "Comments for this provider",
        };

        // Add field descriptions
        if (provider.properties.id) {
          provider.properties.id.description =
            "Unique identifier for this provider instance";
        }
        if (provider.properties.name) {
          provider.properties.name.description =
            "Display name for this provider";
        }
        if (provider.properties.description) {
          provider.properties.description.description =
            "Optional description of this provider instance (shown in UI)";
        }
        if (provider.properties.providerSettings) {
          provider.properties.providerSettings.description =
            "Provider-specific configuration (baseURL, headers, etc.). API keys are loaded from environment variables.";
          // Add comment fields to provider settings
          if (provider.properties.providerSettings.properties) {
            provider.properties.providerSettings.properties._comment = {
              type: "string",
              description: "Comments for provider settings",
            };
          }
        }
        if (provider.properties.models) {
          provider.properties.models.description =
            "List of available models for this provider";

          // Add model documentation
          const modelItems = provider.properties.models.items;
          if (modelItems?.properties) {
            // Add comment fields to model
            modelItems.properties._comment = {
              type: "string",
              description: "Comments for this model",
            };

            if (modelItems.properties.uiName) {
              modelItems.properties.uiName.description =
                "Display name shown in the UI";
            }
            if (modelItems.properties.apiName) {
              modelItems.properties.apiName.description =
                "Model name used in API calls";
            }
            if (modelItems.properties.description) {
              modelItems.properties.description.description =
                "Optional description of this model (shown in UI)";
            }
            if (modelItems.properties.supportsTools) {
              modelItems.properties.supportsTools.description =
                "Whether this model supports function/tool calling";
            }
            if (modelItems.properties.settings) {
              modelItems.properties.settings.description =
                "Model-specific settings (temperature, max tokens, etc.)";
              // Add comment fields to model settings
              if (modelItems.properties.settings.properties) {
                modelItems.properties.settings.properties._comment = {
                  type: "string",
                  description: "Comments for model settings",
                };
              }
            }
            if (modelItems.properties.apiVersion) {
              modelItems.properties.apiVersion.description =
                "Required for Azure OpenAI - API version from your deployment";
            }
          }
        }
      }
    });
  }

  return schema;
}

function getProviderDescription(providerType: string): string {
  const descriptions: Record<string, string> = {
    openai:
      "OpenAI Provider - Requires OPENAI_API_KEY environment variable. Supports GPT-4, GPT-3.5, and other OpenAI models.",
    google:
      "Google Gemini Provider - Requires GOOGLE_GENERATIVE_AI_API_KEY environment variable. Supports Gemini models with advanced reasoning.",
    anthropic:
      "Anthropic Claude Provider - Requires ANTHROPIC_API_KEY environment variable. Supports Claude models with reasoning capabilities and caching.",
    xai: "xAI Grok Provider - Requires XAI_API_KEY environment variable. Supports Grok models with advanced reasoning.",
    openrouter:
      "OpenRouter Provider - Requires OPENROUTER_API_KEY environment variable. Access to multiple AI models through a single API.",
    ollama:
      "Ollama Provider - Local models, no API key required. Must have Ollama running locally on your machine.",
    "openai-compatible":
      "OpenAI-Compatible Provider - For custom providers that implement OpenAI's API format. API key requirements vary by provider.",
    "azure-openai":
      "Azure OpenAI Provider - Requires AZURE_API_KEY environment variable. Access OpenAI models through Microsoft Azure.",
  };

  return descriptions[providerType] || `${providerType} provider configuration`;
}

// Add additional JSON Schema properties for better IDE experience
const enhancedSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  ...enhanceSchemaWithDocumentation(jsonSchema),
};

// Ensure directory exists
const schemaDir = resolve("config");
mkdirSync(schemaDir, { recursive: true });

// Write JSON Schema file
const schemaPath = resolve(schemaDir, "models.schema.json");
writeFileSync(schemaPath, JSON.stringify(enhancedSchema, null, 2));

// Create VS Code settings for JSON Schema mapping
const vscodeDir = resolve(".vscode");
mkdirSync(vscodeDir, { recursive: true });

const vscodeSettings = {
  "json.schemas": [
    {
      fileMatch: ["**/config/models.json", "**/models.json"],
      url: "./config/models.schema.json",
    },
  ],
};

const settingsPath = resolve(vscodeDir, "settings.json");
writeFileSync(settingsPath, JSON.stringify(vscodeSettings, null, 2));

console.log("✅ Generated JSON Schema:", schemaPath);
console.log("✅ Updated VS Code settings:", settingsPath);
console.log("🎉 IDE autocomplete is now enabled for models.json!");
