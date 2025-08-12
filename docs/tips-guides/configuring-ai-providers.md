# Configuring AI Providers

This guide explains how to configure AI providers using the unified JSON configuration system. The application supports multiple AI providers including OpenAI, Google Gemini, Anthropic Claude, Azure OpenAI, OpenAI-compatible providers (like Groq, Together AI), and local Ollama instances.

## Configuration Overview

All providers are configured in a single `config/models.json` file. This unified approach provides:

- ✅ Type safety with schema validation
- ✅ Centralized configuration management
- ✅ Environment variable separation for API keys
- ✅ Hot-reloading during development
- ✅ Easy provider switching and management

## Basic Configuration Structure

Create or edit `config/models.json` in your project root:

```json
{
  "providers": [
    {
      "id": "unique-provider-id",
      "type": "provider-type",
      "name": "Display Name",
      "providerSettings": {
        "baseURL": "https://api.example.com/v1"
      },
      "models": [
        {
          "uiName": "Model Display Name",
          "apiName": "api-model-name",
          "supportsTools": true
        }
      ]
    }
  ]
}
```

## Supported Provider Types

### 1. OpenAI

```json
{
  "id": "openai",
  "type": "openai",
  "name": "OpenAI",
  "providerSettings": {
    "baseURL": "https://api.openai.com/v1",
    "organization": "org-123456789",
    "project": "proj-123456789"
  },
  "models": [
    {
      "uiName": "GPT-4o",
      "apiName": "gpt-4o",
      "supportsTools": true,
      "settings": {
        "maxCompletionTokens": 4000,
        "reasoningEffort": "medium"
      }
    },
    {
      "uiName": "GPT-4o Mini",
      "apiName": "gpt-4o-mini",
      "supportsTools": true
    }
  ]
}
```

Environment variable: `OPENAI_API_KEY`

### 2. Google Gemini

```json
{
  "id": "google",
  "type": "google",
  "name": "Google Gemini",
  "providerSettings": {
    "baseURL": "https://generativelanguage.googleapis.com/v1beta"
  },
  "models": [
    {
      "uiName": "Gemini 2.0 Flash",
      "apiName": "gemini-2.0-flash-exp",
      "supportsTools": true,
      "settings": {
        "safetySettings": [
          {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }
    }
  ]
}
```

Environment variable: `GOOGLE_GENERATIVE_AI_API_KEY`

### 3. Anthropic Claude

```json
{
  "id": "anthropic",
  "type": "anthropic",
  "name": "Anthropic Claude",
  "providerSettings": {
    "baseURL": "https://api.anthropic.com/v1"
  },
  "models": [
    {
      "uiName": "Claude 3.5 Sonnet",
      "apiName": "claude-3-5-sonnet-20241022",
      "supportsTools": true,
      "settings": {
        "sendReasoning": true
      }
    }
  ]
}
```

Environment variable: `ANTHROPIC_API_KEY`

### 4. Azure OpenAI

```json
{
  "id": "azure-openai",
  "type": "azure-openai",
  "name": "Azure OpenAI",
  "providerSettings": {
    "baseURL": "https://your-resource.openai.azure.com"
  },
  "models": [
    {
      "uiName": "GPT-4o (Azure)",
      "apiName": "your-deployment-name",
      "apiVersion": "2025-01-01-preview",
      "supportsTools": true,
      "settings": {
        "temperature": 0.7
      }
    }
  ]
}
```

Environment variable: `AZURE_API_KEY`

### 5. OpenAI-Compatible Providers

For providers or proxies that follow the OpenAI API specification (Groq, Together AI, Perplexity, LiteLLM, etc.):

```json
{
  "id": "groq",
  "type": "openai-compatible",
  "name": "Groq",
  "providerSettings": {
    "baseURL": "https://api.groq.com/openai/v1"
  },
  "models": [
    {
      "uiName": "Llama 3.1 70B",
      "apiName": "llama-3.1-70b-versatile",
      "supportsTools": true
    },
    {
      "uiName": "Mixtral 8x7B",
      "apiName": "mixtral-8x7b-32768",
      "supportsTools": true
    }
  ]
}
```

Environment variable: `GROQ_API_KEY`

### 6. Local Ollama

```json
{
  "id": "ollama",
  "type": "ollama",
  "name": "Local Ollama",
  "providerSettings": {
    "baseURL": "http://localhost:11434/api"
  },
  "models": [
    {
      "uiName": "Llama 3.2",
      "apiName": "llama3.2",
      "supportsTools": true
    },
    {
      "uiName": "Mistral 7B",
      "apiName": "mistral",
      "supportsTools": false
    }
  ]
}
```

Environment variable: Not required (Ollama typically runs without authentication)

### 7. Other Providers

You can add other providers like xAI, OpenRouter, etc.:

```json
{
  "id": "xai",
  "type": "xai",
  "name": "xAI Grok",
  "providerSettings": {
    "baseURL": "https://api.x.ai/v1"
  },
  "models": [
    {
      "uiName": "Grok Beta",
      "apiName": "grok-beta",
      "supportsTools": true
    }
  ]
}
```

Environment variable: `XAI_API_KEY`

## Environment Variable Mapping

The system uses **fallback logic** for API key resolution:

1. **First**: Try ID-based generation (e.g., `OPENAI_DEV_API_KEY` for `id: "openai-dev"`)
2. **Then**: Try provider-type default (e.g., `OPENAI_API_KEY` for all OpenAI providers)

| Provider Type        | Default Env Var               | ID-Based Examples              |
| -------------------- | ------------------------------ | ------------------------------ |
| `openai`             | `OPENAI_API_KEY`               | `OPENAI_DEV_API_KEY`, `OPENAI_PROD_API_KEY` |
| `google`             | `GOOGLE_GENERATIVE_AI_API_KEY` | `GOOGLE_DEV_API_KEY`, `GOOGLE_PROD_API_KEY` |
| `anthropic`          | `ANTHROPIC_API_KEY`            | `ANTHROPIC_DEV_API_KEY`, `ANTHROPIC_PROD_API_KEY` |
| `azure-openai`       | `AZURE_API_KEY`                | `AZURE_DEV_API_KEY`, `AZURE_PROD_API_KEY` |
| `xai`                | `XAI_API_KEY`                  | `XAI_DEV_API_KEY`, `XAI_PROD_API_KEY` |
| `openrouter`         | `OPENROUTER_API_KEY`           | `OPENROUTER_DEV_API_KEY`, `OPENROUTER_PROD_API_KEY` |
| `openai-compatible`  | `{ID}_API_KEY`                 | `GROQ_API_KEY`, `MY_CUSTOM_PROVIDER_API_KEY` |
| `ollama`             | No API key required            | No API key required            |

## Configuration Fields Reference

### Provider Fields

- **`id`** (required): Unique identifier for the provider (can be any string, e.g., `"openai-dev"`, `"anthropic-prod"`, `"my-custom-openai"`)
- **`type`** (required): Provider type (`openai`, `google`, `anthropic`, `azure-openai`, `openai-compatible`, `ollama`, `xai`, `openrouter`)
- **`name`** (required): Display name shown in the UI
- **`providerSettings`** (optional): Provider-specific configuration
  - **`baseURL`**: API endpoint URL
  - **`organization`**: Organization ID (OpenAI only)
  - **`project`**: Project ID (OpenAI only)
  - **`headers`**: Custom HTTP headers
- **`models`** (required): Array of available models

### Model Fields

- **`uiName`** (required): Display name shown in the UI
- **`apiName`** (required): Model identifier used in API calls
- **`supportsTools`** (optional): Whether the model supports function calling (defaults to `true`)
- **`apiVersion`** (required for Azure): API version for Azure OpenAI models
- **`settings`** (optional): Model-specific settings (varies by provider)

## Multiple Provider Instances

You can configure multiple instances of the same provider type with different IDs:

```json
{
  "providers": [
    {
      "id": "openai-dev",
      "type": "openai",
      "name": "OpenAI Development",
      "models": [{ "uiName": "GPT-4o Dev", "apiName": "gpt-4o" }]
    },
    {
      "id": "openai-prod",
      "type": "openai", 
      "name": "OpenAI Production",
      "models": [{ "uiName": "GPT-4o Prod", "apiName": "gpt-4o" }]
    }
  ]
}
```

Environment variables: `OPENAI_API_KEY` (shared) **OR** `OPENAI_DEV_API_KEY` and `OPENAI_PROD_API_KEY` (per-instance)

The system first tries ID-based keys (`OPENAI_DEV_API_KEY`), then falls back to the provider-type default (`OPENAI_API_KEY`). This means:

- ✅ **Per-instance overrides**: Set `OPENAI_DEV_API_KEY` and `OPENAI_PROD_API_KEY` to override the default
- ✅ **Backwards compatible**: Existing `OPENAI_API_KEY` still works as fallback for all OpenAI instances

## Multi-Provider Configuration Example

You can configure multiple providers in the same file:

```json
{
  "providers": [
    {
      "id": "openai",
      "type": "openai",
      "name": "OpenAI",
      "models": [
        {
          "uiName": "GPT-4o",
          "apiName": "gpt-4o",
          "supportsTools": true
        }
      ]
    },
    {
      "id": "anthropic",
      "type": "anthropic",
      "name": "Anthropic",
      "models": [
        {
          "uiName": "Claude 3.5 Sonnet",
          "apiName": "claude-3-5-sonnet-20241022",
          "supportsTools": true
        }
      ]
    },
    {
      "id": "groq",
      "type": "openai-compatible",
      "name": "Groq",
      "providerSettings": {
        "baseURL": "https://api.groq.com/openai/v1"
      },
      "models": [
        {
          "uiName": "Llama 3.1 70B",
          "apiName": "llama-3.1-70b-versatile",
          "supportsTools": true
        }
      ]
    }
  ]
}
```

## Setup Instructions

1. **Create Configuration**: Create `config/models.json` with your desired providers
2. **Set API Keys**: Add corresponding environment variables to your `.env` file
3. **Restart Application**: Restart your application to load the new configuration
4. **Verify**: Check the model dropdown in the UI to see your configured providers

## Migration from Old System

If you were using the previous configuration system:

1. **Remove** the old `openai-compatible.config.ts` file
2. **Remove** the `OPENAI_COMPATIBLE_DATA` environment variable
3. **Create** the new `config/models.json` file using the examples above
4. **Move** your API keys to individual environment variables (see mapping table)
5. **Update** any hardcoded provider references in your code

## Troubleshooting

### Provider Not Showing Up

The system **gracefully skips invalid providers** instead of failing entirely. Check application logs for specific warnings:

- **Missing API Key**: Provider is skipped if the required API key environment variable is not set
- **Invalid Configuration**: Provider is skipped if the JSON configuration has syntax errors or missing required fields
- **Unknown Provider Type**: Provider is skipped if the `type` is not one of the supported values
- **Failed Validation**: Provider is skipped if it fails schema validation (e.g., missing `baseURL` for OpenAI-compatible providers)

**✅ This means other valid providers will still work even if one is misconfigured!**

### Models Not Loading

- Verify model `apiName` matches the provider's API documentation
- Check that the `baseURL` is correct for your provider
- Ensure API keys have sufficient permissions
- For Azure OpenAI, verify the `apiVersion` is set correctly

### Tool Support Issues

- Set `supportsTools: false` for models that don't support function calling
- Check provider documentation for tool/function calling support
- Some older models may not support tools even if the provider does

The new unified configuration system provides a much cleaner and more maintainable way to manage all your AI providers in one place!
