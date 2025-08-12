# User Identification Feature

## Overview
This feature allows Better Chatbot to pass user identification information to AI provider APIs, enabling better tracking, rate limiting, and usage monitoring on the provider side.

## Configuration

### Environment Variables

1. **`PASS_USER_TO_API_CALLS`** (boolean, default: false)
   - Set to `true` to enable user identification
   - When enabled, user information is passed to AI providers with each API call

2. **`API_USER_HEADER_KEY`** (string, default: "x-user-id")
   - The header key used to pass user identification to providers
   - Can be customized based on provider requirements

3. **`API_END_USER_ID_FIELD`** (string, default: "email")
   - The user object field to use as the identifier
   - Common options: "email", "id", "username", or any custom field

### Example Configuration

```bash
# Enable user identification
PASS_USER_TO_API_CALLS=true

# Use custom header for OpenWebUI compatibility
API_USER_HEADER_KEY=x-openwebui-user-email

# Use email as the user identifier
API_END_USER_ID_FIELD=email
```

## How It Works

1. When `PASS_USER_TO_API_CALLS` is enabled, the system retrieves the current user session
2. The specified user field (e.g., email) is extracted from the user object
3. This identifier is passed to AI providers in two ways:
   - As a custom header (using `API_USER_HEADER_KEY`)
   - As a `user` parameter in model settings (for providers that support it)

## Supported Providers

The feature works with all configured providers:
- **OpenAI**: passes as `user` parameter + header
- **Anthropic**: passes via `providerOptions` metadata only + header
- **Google Gemini**: passes via `providerOptions` metadata only + header  
- **xAI Grok**: passes as `user` parameter + header
- **OpenRouter**: passes as `user` parameter + header
- **Ollama**: passes as `user` parameter + header
- **Azure OpenAI**: passes as `user` parameter + header
- **OpenAI-compatible APIs**: passes as `user` parameter + header

Note: Anthropic and Google use a special `providerOptions` object with metadata format for user tracking, which is passed to the AI SDK separately from model settings.

## Benefits

1. **Usage Tracking**: Monitor API usage per user on the provider side
2. **Rate Limiting**: Implement per-user rate limits at the provider level
3. **Compliance**: Meet requirements for user attribution in API calls
4. **Cost Allocation**: Track costs per user for billing purposes
5. **Security**: Better audit trails for API usage

## Testing

The feature includes comprehensive test coverage:

### Test Files
- `src/lib/ai/core/models.user-identification.test.ts` - User identification specific tests
- `src/lib/ai/core/models.test.ts` - Updated to handle async model retrieval

### Test Coverage
- Environment variable configuration
- Custom header and field configuration
- All provider types
- Error handling (missing users, missing fields)
- Fallback scenarios
- Integration with existing model settings

### Running Tests

```bash
# Run all model tests
npm test src/lib/ai/core/models

# Run only user identification tests
npm test src/lib/ai/core/models.user-identification.test.ts
```

## Security Considerations

1. **Privacy**: Only pass necessary user information (avoid sensitive data)
2. **Configuration**: Keep user identification disabled by default
3. **Field Selection**: Choose appropriate fields that don't expose PII unnecessarily
4. **Provider Trust**: Only enable for trusted AI providers

## Migration Notes

The `getModel` function in `modelRegistry` is now async and returns additional properties. Any code calling this function needs to be updated:

```typescript
// Before
const model = modelRegistry.getModel(chatModel);

// After
const { model, settings, supportsTools, providerOptions } = await modelRegistry.getModel(chatModel);
```

### New Return Properties

- **`providerOptions`**: Contains provider-specific options for user identification, particularly for Anthropic which uses a special metadata format for user tracking.

## Future Enhancements

Potential improvements for the feature:
1. Per-provider user identification configuration
2. User ID transformation/hashing for privacy
3. Conditional user identification based on model or request type
4. Integration with provider-specific user management APIs