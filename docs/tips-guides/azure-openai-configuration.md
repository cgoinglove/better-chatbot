# Azure OpenAI Configuration Guide

This guide provides comprehensive instructions for configuring Azure OpenAI models in your Better Chatbot application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Understanding Azure OpenAI](#understanding-azure-openai)
- [Configuration Methods](#configuration-methods)
  - [Method 1: File-Based Configuration](#method-1-file-based-configuration-recommended-for-localdocker)
  - [Method 2: Environment Variable Configuration](#method-2-environment-variable-configuration-for-vercelcloud)
- [Configuration Examples](#configuration-examples)
- [API Versions](#api-versions)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Technical Details](#technical-details)

---

## Overview

Azure OpenAI is **fully supported** in Better Chatbot with dedicated infrastructure that handles Azure's unique API requirements:

- ✅ Deployment-based URL routing
- ✅ API version management
- ✅ Azure-specific authentication (`api-key` header)
- ✅ Tool/function calling support
- ✅ Streaming responses
- ✅ Multiple deployments and models

**Implementation files:**
- [`src/lib/ai/azure-openai-compatible.ts`](../../src/lib/ai/azure-openai-compatible.ts) - Azure-specific handler
- [`src/lib/ai/create-openai-compatiable.ts`](../../src/lib/ai/create-openai-compatiable.ts) - Integration layer

---

## Prerequisites

Before configuring Azure OpenAI, you need:

1. **Azure OpenAI Resource**
   - An active Azure subscription
   - An Azure OpenAI resource deployed
   - Your resource name (e.g., `mycompany`)

2. **API Key**
   - Access key from your Azure OpenAI resource
   - Found in: Azure Portal → Your Resource → Keys and Endpoint

3. **Model Deployments**
   - At least one model deployed in Azure OpenAI Studio
   - Note the deployment name (e.g., `gpt-4o-production`)
   - Know which models you've deployed

4. **API Version**
   - The API version you want to use (e.g., `2025-01-01-preview`)
   - See [API Versions](#api-versions) section for details

---

## Understanding Azure OpenAI

### Key Differences from Standard OpenAI

Azure OpenAI differs from the standard OpenAI API in several ways:

| Aspect | Standard OpenAI | Azure OpenAI |
|--------|----------------|--------------|
| **URL Structure** | `https://api.openai.com/v1` | `https://<resource>.openai.azure.com/openai/deployments/` |
| **Authentication** | `Authorization: Bearer <key>` | `api-key: <key>` |
| **Model Reference** | Model name (e.g., `gpt-4o`) | Deployment name (your custom name) |
| **API Version** | Not required | Required as query parameter |

### URL Construction

For Azure OpenAI, the final URL is constructed as:

```
https://<resource-name>.openai.azure.com/openai/deployments/<deployment-name>/<endpoint>?api-version=<version>
```

**Example:**
```
https://mycompany.openai.azure.com/openai/deployments/gpt4o-prod/chat/completions?api-version=2025-01-01-preview
```

---

## Configuration Methods

Choose the method that best fits your deployment environment.

### Method 1: File-Based Configuration (Recommended for Local/Docker)

This method uses a TypeScript configuration file that's version-controlled and type-safe.

#### Step 1: Open Configuration File

Open [`openai-compatible.config.ts`](../../openai-compatible.config.ts) in your project root.

#### Step 2: Add Azure OpenAI Configuration

```typescript
import { type OpenAICompatibleProvider } from "./src/lib/ai/create-openai-compatiable";

const providers: OpenAICompatibleProvider[] = [
  {
    provider: "Azure OpenAI",
    apiKey: "your-azure-api-key-here",
    baseUrl: "https://your-resource-name.openai.azure.com/openai/deployments/",
    models: [
      {
        apiName: "your-deployment-name",
        uiName: "GPT-4o (Azure)",
        supportsTools: true,
        apiVersion: "2025-01-01-preview",
      },
    ],
  },
];

export default providers;
```

#### Step 3: Update Environment

Run the parser to update your environment:

```bash
pnpm openai-compatiable:parse
```

This command:
- Validates your configuration
- Updates the `.env` file if needed
- Registers the models with the application

#### Step 4: Restart Application

```bash
pnpm dev
```

Your Azure OpenAI models will now appear in the model selector.

---

### Method 2: Environment Variable Configuration (For Vercel/Cloud)

This method uses an environment variable, ideal for cloud deployments where you can't edit files.

#### Step 1: Generate Configuration

1. Visit: https://mcp-client-chatbot-openai-like.vercel.app/
2. Configure your Azure OpenAI models using the UI
3. Click "Generate JSON"
4. Copy the generated JSON

#### Step 2: Set Environment Variable

Add the JSON to your environment as `OPENAI_COMPATIBLE_DATA`:

**Example JSON:**
```json
[
  {
    "provider": "Azure OpenAI",
    "apiKey": "your-api-key",
    "baseUrl": "https://mycompany.openai.azure.com/openai/deployments/",
    "models": [
      {
        "apiName": "gpt4o-deployment",
        "uiName": "GPT-4o",
        "supportsTools": true,
        "apiVersion": "2025-01-01-preview"
      }
    ]
  }
]
```

**For Vercel:**
```bash
vercel env add OPENAI_COMPATIBLE_DATA
# Paste the JSON when prompted
```

**For other platforms:**
Set `OPENAI_COMPATIBLE_DATA` as an environment variable with the JSON value.

#### Step 3: Deploy/Restart

Redeploy your application or restart it to pick up the new environment variable.

---

## Configuration Examples

### Example 1: Single Model Configuration

```typescript
{
  provider: "Azure OpenAI",
  apiKey: "abc123def456ghi789",
  baseUrl: "https://mycompany.openai.azure.com/openai/deployments/",
  models: [
    {
      apiName: "gpt4o-production",        // Your Azure deployment name
      uiName: "GPT-4o",                   // Display name in UI
      supportsTools: true,                 // Enable function calling
      apiVersion: "2025-01-01-preview",   // Azure API version
    },
  ],
}
```

### Example 2: Multiple Models Configuration

```typescript
{
  provider: "Azure OpenAI",
  apiKey: "abc123def456ghi789",
  baseUrl: "https://mycompany.openai.azure.com/openai/deployments/",
  models: [
    {
      apiName: "gpt4o-prod",
      uiName: "GPT-4o (Production)",
      supportsTools: true,
      apiVersion: "2025-01-01-preview",
    },
    {
      apiName: "gpt4o-mini-prod",
      uiName: "GPT-4o Mini (Production)",
      supportsTools: true,
      apiVersion: "2025-01-01-preview",
    },
    {
      apiName: "gpt35-turbo-dev",
      uiName: "GPT-3.5 Turbo (Dev)",
      supportsTools: true,
      apiVersion: "2024-02-01",          // Older API version
    },
  ],
}
```

### Example 3: Multiple Azure Resources

If you have multiple Azure OpenAI resources:

```typescript
const providers: OpenAICompatibleProvider[] = [
  {
    provider: "Azure OpenAI US",
    apiKey: "us-key-here",
    baseUrl: "https://mycompany-us.openai.azure.com/openai/deployments/",
    models: [
      {
        apiName: "gpt4o-us",
        uiName: "GPT-4o (US East)",
        supportsTools: true,
        apiVersion: "2025-01-01-preview",
      },
    ],
  },
  {
    provider: "Azure OpenAI EU",
    apiKey: "eu-key-here",
    baseUrl: "https://mycompany-eu.openai.azure.com/openai/deployments/",
    models: [
      {
        apiName: "gpt4o-eu",
        uiName: "GPT-4o (EU West)",
        supportsTools: true,
        apiVersion: "2025-01-01-preview",
      },
    ],
  },
];
```

### Example 4: Models Without Tool Support

Some older models don't support function calling:

```typescript
{
  provider: "Azure OpenAI",
  apiKey: "abc123def456ghi789",
  baseUrl: "https://mycompany.openai.azure.com/openai/deployments/",
  models: [
    {
      apiName: "gpt35-legacy",
      uiName: "GPT-3.5 (Legacy)",
      supportsTools: false,              // Disable tool/function calling
      apiVersion: "2023-05-15",
    },
  ],
}
```

---

## API Versions

Azure OpenAI requires an API version for each request. Different versions may support different features.

### Recommended Versions

| API Version | Release Date | Features | Status |
|-------------|--------------|----------|--------|
| `2025-01-01-preview` | Jan 2025 | Latest GPT-4o models, improved function calling | ✅ Recommended |
| `2024-10-01-preview` | Oct 2024 | GPT-4o, GPT-4o-mini | ✅ Stable |
| `2024-08-01-preview` | Aug 2024 | GPT-4o | ✅ Stable |
| `2024-02-01` | Feb 2024 | GPT-3.5, GPT-4 Turbo | ✅ GA |
| `2023-12-01-preview` | Dec 2023 | GPT-4 Vision | ✅ Stable |

### Finding the Right Version

1. **Check Azure Documentation**: [Azure OpenAI API Versions](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
2. **Test in Azure OpenAI Studio**: Try different versions in the playground
3. **Model Support**: Ensure the version supports your deployed model

### Version Per Model

You can use different API versions for different models:

```typescript
models: [
  {
    apiName: "gpt4o-latest",
    uiName: "GPT-4o",
    supportsTools: true,
    apiVersion: "2025-01-01-preview",  // Latest version
  },
  {
    apiName: "gpt35-stable",
    uiName: "GPT-3.5 Turbo",
    supportsTools: true,
    apiVersion: "2024-02-01",          // Stable GA version
  },
]
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "API version is required for Azure OpenAI model"

**Cause**: Missing `apiVersion` field in model configuration.

**Solution**: Add `apiVersion` to each Azure OpenAI model:
```typescript
{
  apiName: "gpt4o-prod",
  uiName: "GPT-4o",
  supportsTools: true,
  apiVersion: "2025-01-01-preview",  // ← Required
}
```

#### Issue: 404 Error - Deployment Not Found

**Cause**: Incorrect deployment name or base URL.

**Solutions:**
1. Verify deployment name in Azure Portal
2. Check that deployment is active
3. Ensure base URL ends with `/deployments/`

```typescript
// ✅ Correct
baseUrl: "https://mycompany.openai.azure.com/openai/deployments/"

// ❌ Incorrect
baseUrl: "https://mycompany.openai.azure.com/openai/deployments"  // Missing trailing slash
baseUrl: "https://mycompany.openai.azure.com"                       // Missing path
```

#### Issue: 401 Unauthorized

**Cause**: Invalid API key or wrong authentication method.

**Solutions:**
1. Verify API key in Azure Portal → Keys and Endpoint
2. Regenerate key if needed
3. Ensure no extra spaces in the key
4. Provider should be exactly `"Azure OpenAI"` (case-sensitive)

#### Issue: 400 Bad Request - Invalid API Version

**Cause**: Unsupported or incorrect API version.

**Solutions:**
1. Check [Azure API versions documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
2. Try a stable GA version like `"2024-02-01"`
3. Ensure version format is correct (e.g., `"2025-01-01-preview"`, not `"2025-1-1-preview"`)

#### Issue: Models Not Appearing in UI

**Cause**: Configuration not loaded or parsed incorrectly.

**Solutions:**

For file-based configuration:
```bash
# Re-run the parser
pnpm openai-compatiable:parse

# Restart the application
pnpm dev
```

For environment variable:
1. Verify `OPENAI_COMPATIBLE_DATA` is set
2. Ensure JSON is valid (use a JSON validator)
3. Restart the application

#### Issue: Function Calling Not Working

**Cause**: Model doesn't support tools or `supportsTools` is false.

**Solutions:**
1. Set `supportsTools: true` for models that support function calling
2. Use a compatible API version (2024-02-01 or later)
3. Verify model deployment supports function calling

---

## Best Practices

### 1. Security

- **Never commit API keys**: Use environment variables or secure vaults
- **Rotate keys regularly**: Generate new keys periodically
- **Use managed identities**: When possible in Azure environments
- **Restrict access**: Use Azure RBAC to limit key access

```typescript
// ❌ Don't do this
apiKey: "abc123def456",  // Hardcoded key

// ✅ Do this (file-based config with .env)
apiKey: process.env.AZURE_OPENAI_API_KEY!,

// ✅ Or this (environment variable method)
// Set OPENAI_COMPATIBLE_DATA with the key
```

### 2. Naming Conventions

Use clear, descriptive names for deployments and UI display:

```typescript
// ✅ Good naming
{
  apiName: "gpt4o-production-v1",      // Clear deployment purpose
  uiName: "GPT-4o (Production)",       // User-friendly name
}

// ❌ Unclear naming
{
  apiName: "deployment1",              // Not descriptive
  uiName: "Model A",                   // Not informative
}
```

### 3. Environment-Based Configuration

Separate configurations for different environments:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const providers: OpenAICompatibleProvider[] = [
  {
    provider: "Azure OpenAI",
    apiKey: isDevelopment 
      ? process.env.AZURE_DEV_API_KEY!
      : process.env.AZURE_PROD_API_KEY!,
    baseUrl: isDevelopment
      ? "https://mycompany-dev.openai.azure.com/openai/deployments/"
      : "https://mycompany-prod.openai.azure.com/openai/deployments/",
    models: [/* ... */],
  },
];
```

### 4. API Version Strategy

- **Production**: Use stable GA versions (e.g., `2024-02-01`)
- **Development**: Test preview versions for new features
- **Version per model**: Match version to model requirements

### 5. Tool Support Declaration

Accurately declare tool support to avoid runtime errors:

```typescript
// Check Azure documentation for your model's capabilities
{
  apiName: "gpt4o-latest",
  uiName: "GPT-4o",
  supportsTools: true,    // ✅ GPT-4o supports tools
},
{
  apiName: "text-davinci-003",
  uiName: "Davinci",
  supportsTools: false,   // ✅ Older models don't support tools
}
```

### 6. Multiple Deployments

Use multiple deployments for different purposes:

- **Production**: High rate limits, stable version
- **Development**: Lower cost, preview features
- **Testing**: Isolated from production data

### 7. Monitoring and Logging

Azure OpenAI provides detailed logging. Monitor:
- Request rates and throttling
- Error rates by deployment
- Token usage and costs
- Model performance metrics

---

## Technical Details

### How It Works

The Azure OpenAI integration uses a custom implementation that:

1. **URL Construction**: Appends deployment name to base URL
   ```typescript
   // Base: https://mycompany.openai.azure.com/openai/deployments/
   // Deployment: gpt4o-prod
   // Result: https://mycompany.openai.azure.com/openai/deployments/gpt4o-prod
   ```

2. **API Version Injection**: Adds `api-version` as query parameter
   ```typescript
   // URL: /chat/completions
   // Result: /chat/completions?api-version=2025-01-01-preview
   ```

3. **Authentication Header**: Uses `api-key` instead of `Authorization`
   ```typescript
   headers: {
     'api-key': 'your-api-key',
     // Note: Authorization header is explicitly removed
   }
   ```

4. **Custom Fetch**: Intercepts all requests to apply Azure-specific transformations

### Provider Detection

The system detects Azure OpenAI by checking:
```typescript
if (provider === "Azure OpenAI") {
  // Use Azure-specific handler
}
```

**Important**: Provider name must be exactly `"Azure OpenAI"` (case-sensitive).

### Configuration Schema

The configuration follows this TypeScript schema:

```typescript
type OpenAICompatibleProvider = {
  provider: string;              // "Azure OpenAI"
  apiKey: string;                // Your Azure API key
  baseUrl: string;               // Azure resource URL + /deployments/
  models: Array<{
    apiName: string;             // Azure deployment name
    uiName: string;              // Display name
    supportsTools: boolean;      // Function calling support
    apiVersion: string;          // Azure API version (required for Azure)
  }>;
};
```

### Related Files

- **Implementation**: [`src/lib/ai/azure-openai-compatible.ts`](../../src/lib/ai/azure-openai-compatible.ts)
- **Integration**: [`src/lib/ai/create-openai-compatiable.ts`](../../src/lib/ai/create-openai-compatiable.ts)
- **Tests**: [`src/lib/ai/azure-openai-compatible.test.ts`](../../src/lib/ai/azure-openai-compatible.test.ts)
- **Schema**: [`src/lib/ai/create-openai-compatiable.ts`](../../src/lib/ai/create-openai-compatiable.ts) (lines 76-114)
- **Config Template**: [`openai-compatible.config.ts`](../../openai-compatible.config.ts)

---

## Additional Resources

- [Azure OpenAI Service Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Azure OpenAI API Reference](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
- [Adding OpenAI-like Providers Guide](./adding-openAI-like-providers.md)

---

## Need Help?

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [Azure OpenAI documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
3. Check application logs for detailed error messages
4. Open an issue with:
   - Your configuration (redact API keys)
   - Error messages
   - Steps to reproduce

---

**Last Updated**: 2025-10-17  
**Tested With**: Azure OpenAI API versions 2024-02-01 through 2025-01-01-preview