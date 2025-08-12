# Model Configuration

This directory contains configuration files for customizing AI model providers and their models.

## Unified Model Configuration

The new unified system uses a single JSON configuration file with full type safety and IDE support.

### Usage

1. Copy `models.example.json` to `models.json`
2. Customize the provider and model definitions as needed
3. Set the environment variable: `MODEL_CONFIG_JSON_PATH=./config/models.json` (optional, defaults to `./config/models.json`)
4. Run `pnpm generate:json-schema` to enable IDE autocomplete

### Configuration Structure

The JSON file uses an array-based structure with discriminated unions for type safety:

```json
{
  "providers": [
    {
      "id": "openai",
      "type": "openai",
      "name": "OpenAI",
      "providerSettings": {
        "organization": "optional-org-id"
      },
      "models": [
        {
          "uiName": "GPT-4o",
          "apiName": "gpt-4o",
          "supportsTools": true,
          "settings": {
            "reasoningEffort": "medium",
            "maxCompletionTokens": 4000
          }
        }
      ]
    }
  ]
}
```

### Provider Types

**Native Providers:**

- `"openai"` - OpenAI GPT models
- `"google"` - Google Gemini models
- `"anthropic"` - Anthropic Claude models
- `"xai"` - xAI Grok models
- `"openrouter"` - OpenRouter models
- `"ollama"` - Local Ollama models

**OpenAI-Compatible Providers:**

- `"groq"` - Groq models
- `"fireworks"` - Fireworks AI models
- `"your-custom-provider"` - Any custom provider name

**Special Providers:**

- `"azure-openai"` - Azure OpenAI with API version support

### Model Fields

- **id**: Unique provider identifier (can be any string, enabling multiple instances like `"openai-dev"`, `"openai-prod"`)
- **type**: Provider type (determines which AI SDK integration to use)
- **name**: Display name for the provider
- **providerSettings**: Provider-specific configuration (baseURL, headers, etc.)
- **models**: Array of model definitions

### Model Definition Fields

- **uiName**: The name displayed in the UI
- **apiName**: The actual model identifier used by the provider's API
- **supportsTools**: Whether the model supports tool calling (defaults to `true`)
- **apiVersion**: Required for Azure OpenAI models
- **settings**: Provider-specific model settings that match AI SDK types

### Provider Settings by Type

**OpenAI Settings:**

```json
{
  "providerSettings": {
    "baseURL": "https://api.openai.com/v1",
    "organization": "org-123",
    "project": "proj-456"
  },
  "settings": {
    "reasoningEffort": "medium",
    "maxCompletionTokens": 4000,
    "structuredOutputs": true,
    "parallelToolCalls": true
  }
}
```

**Google Settings:**

```json
{
  "settings": {
    "structuredOutputs": true,
    "safetySettings": [
      {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      }
    ],
    "thinkingConfig": {
      "thinkingBudget": 1000
    }
  }
}
```

**Anthropic Settings:**

```json
{
  "settings": {
    "sendReasoning": true,
    "cacheControl": {
      "type": "ephemeral",
      "ttl": "1h"
    }
  }
}
```

### Adding Custom Providers

To add "My Model" (OpenAI-compatible):

```json
{
  "id": "my-model",
  "type": "my-custom-provider",
  "name": "My Custom Model",
  "providerSettings": {
    "baseURL": "https://api.my-ai.com/v1"
  },
  "models": [
    {
      "uiName": "My Awesome LLM",
      "apiName": "my-llm-v1",
      "supportsTools": true,
      "settings": {
        "temperature": 0.8,
        "maxTokens": 4000
      }
    }
  ]
}
```

### Environment Variables (SECURITY CRITICAL)

**🚨 API keys are NEVER stored in JSON files for security reasons.**

API keys and sensitive data must be configured via environment variables:

```bash
# API Keys (required for each provider you want to use)
OPENAI_API_KEY=your-openai-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key
ANTHROPIC_API_KEY=your-anthropic-key
XAI_API_KEY=your-xai-key
OPENROUTER_API_KEY=your-openrouter-key
GROQ_API_KEY=your-groq-key
MY_CUSTOM_PROVIDER_API_KEY=your-custom-key
AZURE_API_KEY=your-azure-key

# Base URLs are configured in the JSON file, not environment variables
# Only API keys should be in environment variables for security reasons

# Model Configuration Path (optional)
MODEL_CONFIG_JSON_PATH=./config/models.json
```

### Environment Variable Mapping

The system automatically maps provider IDs to environment variables:

- `openai` → `OPENAI_API_KEY`
- `google` → `GOOGLE_GENERATIVE_AI_API_KEY`
- `anthropic` → `ANTHROPIC_API_KEY`
- `my-custom-provider` → `MY_CUSTOM_PROVIDER_API_KEY`

For custom providers, the system converts the provider `id` to `UPPERCASE_WITH_UNDERSCORES_API_KEY`.

### IDE Support

Run `pnpm generate:json-schema` to create:

- `config/models.schema.json` - JSON Schema for validation
- `.vscode/settings.json` - VS Code autocomplete configuration

This enables full IntelliSense support with:

- ✅ Type validation for all provider settings
- ✅ Autocomplete for model configuration options
- ✅ Error detection for invalid configurations
- ✅ Hover documentation for all fields

### Migration from Old System

The new system replaces:

- ❌ `openai-compatible.config.ts`
- ❌ `OPENAI_COMPATIBLE_DATA` environment variable
- ❌ Multiple configuration files
- ❌ Hardcoded provider lists

Everything is now in one unified, type-safe JSON configuration.

### Resilient Configuration Loading

The system uses **graceful error handling** - invalid providers are skipped instead of failing the entire configuration:

- ✅ **Flexible Provider IDs**: Use any ID like `"openai-dev"`, `"anthropic-prod"`, `"my-custom-openai"`
- ✅ **Partial Failures**: If one provider fails validation, others continue to work
- ✅ **Missing API Keys**: Providers without API keys are simply skipped (logged as warnings)
- ✅ **Invalid Configuration**: Malformed provider configs are skipped, not fatal errors
- ✅ **Multiple Instances**: Configure multiple instances of the same provider type

### Notes

- If `MODEL_CONFIG_JSON_PATH` is not set, defaults to `./config/models.json`
- Only providers with valid API keys will be enabled (except Ollama)
- Ollama doesn't require an API key but models must be defined in the configuration
- The configuration is validated using Zod schemas to ensure type safety
- Base URLs are configured in JSON and cannot be overridden by environment variables
- All configurations support proxy usage via custom base URLs
