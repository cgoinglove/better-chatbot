# AWS Bedrock Integration Guide

## Overview

AWS Bedrock is fully integrated into Better Chatbot, enabling access to 26 Claude and Llama models through Amazon Bedrock with flexible credential management. This guide covers setup, configuration, and all available models.

## Quick Start

### 1. Install Dependencies

The AWS Bedrock SDK is already included in the project via `@ai-sdk/amazon-bedrock`.

### 2. Configure AWS Credentials

Add your AWS credentials to `.env`:

```env
# === AWS Bedrock ===
# AWS credentials for Bedrock access
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
# (Optional) For temporary credentials (session-based access)
AWS_SESSION_TOKEN=your_session_token_here
# AWS region for Bedrock (default: us-east-1)
AWS_REGION=us-east-1
```

### 3. Restart the Application

```bash
pnpm dev
```

Your Bedrock models will now appear in the model selector!

---

## Available Models (26 Total)

All models use **inference profile IDs** for better availability and cross-region routing.

### Claude 4.5 Models (Latest Generation)
- ✅ **Claude Sonnet 4.5** - `us.anthropic.claude-sonnet-4-5-20250929-v1:0`
- ✅ **Claude Haiku 4.5** - `us.anthropic.claude-haiku-4-5-20251001-v1:0`

### Claude 4.1 & 4 Models
- ✅ **Claude Opus 4.1** - `us.anthropic.claude-opus-4-1-20250805-v1:0`
- ✅ **Claude Opus 4** - `us.anthropic.claude-opus-4-20250514-v1:0`
- ✅ **Claude Sonnet 4** - `us.anthropic.claude-sonnet-4-20250514-v1:0`

### Claude 3.7 Models
- ✅ **Claude 3.7 Sonnet** - `us.anthropic.claude-3-7-sonnet-20250219-v1:0`

### Claude 3.5 Models
- ✅ **Claude 3.5 Sonnet v2** - `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
- ✅ **Claude 3.5 Sonnet** - `us.anthropic.claude-3-5-sonnet-20240620-v1:0`
- ✅ **Claude 3.5 Haiku** - `us.anthropic.claude-3-5-haiku-20241022-v1:0`

### Claude 3 Models
- ✅ **Claude 3 Opus** - `us.anthropic.claude-3-opus-20240229-v1:0`
- ✅ **Claude 3 Sonnet** - `us.anthropic.claude-3-sonnet-20240229-v1:0`
- ✅ **Claude 3 Haiku** - `us.anthropic.claude-3-haiku-20240307-v1:0`

**All Claude models support:**
- ✅ Image inputs
- ✅ Tool calling/MCP integration
- ✅ Streaming responses

### Llama 4 Models
- ✅ **Llama 4 Scout 17B** - `us.meta.llama4-scout-17b-instruct-v1:0`
- ✅ **Llama 4 Maverick 17B** - `us.meta.llama4-maverick-17b-instruct-v1:0`

### Llama 3.3 Models
- ✅ **Llama 3.3 70B** - `us.meta.llama3-3-70b-instruct-v1:0`

### Llama 3.2 Models
- ✅ **Llama 3.2 90B** - `us.meta.llama3-2-90b-instruct-v1:0`
- ✅ **Llama 3.2 11B** - `us.meta.llama3-2-11b-instruct-v1:0`
- ✅ **Llama 3.2 3B** - `us.meta.llama3-2-3b-instruct-v1:0`
- ✅ **Llama 3.2 1B** - `us.meta.llama3-2-1b-instruct-v1:0`

### Llama 3.1 Models
- ✅ **Llama 3.1 70B** - `us.meta.llama3-1-70b-instruct-v1:0`
- ✅ **Llama 3.1 8B** - `us.meta.llama3-1-8b-instruct-v1:0`

### Llama 3 Models
- ✅ **Llama 3 70B** - `meta.llama3-70b-instruct-v1:0` (direct model ID)
- ✅ **Llama 3 8B** - `meta.llama3-8b-instruct-v1:0` (direct model ID)

---

## Understanding Inference Profiles

### What Are Inference Profiles?

Inference profiles provide:
- **Cross-region routing** - Automatic failover to available regions
- **Better availability** - Higher reliability than direct model IDs
- **Required for newer models** - On-demand access to Claude 4.x and Llama 4
- **Simplified access** - No need to manage model versions per region

### Inference Profile vs Direct Model ID

**Use Inference Profiles (IDs starting with `us.`):**
- ✅ All Claude 4.5, 4.1, 4, 3.7, 3.5 models
- ✅ All Claude 3 models (for better availability)
- ✅ All Llama 4 and 3.3 models
- ✅ Most Llama 3.2 and 3.1 models

**Direct Model IDs (older models only):**
- Only Llama 3 (70B, 8B) work with direct model IDs

### The Fixed Error

**Original Error:**
```
Invocation of model ID anthropic.claude-haiku-4-5-20251001-v1:0 with on-demand throughput isn't supported.
Retry your request with the ID or ARN of an inference profile that contains this model.
```

**Solution:** Use inference profile ID `us.anthropic.claude-haiku-4-5-20251001-v1:0` instead.

---

## Credential Types

### Permanent Credentials (Recommended for Development)

Standard AWS access keys:
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

**Advantages:**
- Don't expire
- Simple to configure
- Suitable for local development

**Security Note:** Never commit these to version control!

### Temporary Credentials (Recommended for Production)

Session-based credentials that expire:
```env
AWS_ACCESS_KEY_ID=ASIA<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_SESSION_TOKEN=<your-session-token>
AWS_REGION=us-east-1
```

**Advantages:**
- Enhanced security
- Time-limited access
- Better for production environments

**Note:** Requires periodic refresh (typically 1-12 hours)

---

## How It Works

### Architecture

```
User Request
    ↓
Better Chatbot Model Provider
    ↓
AWS Bedrock Provider (aws-bedrock-provider.ts)
    ↓
Load Credentials from Environment
    ↓
    ├─→ Permanent: Access Key + Secret
    └─→ Temporary: Access Key + Secret + Session Token
    ↓
Initialize Bedrock Client
    ↓
Select Model (Inference Profile ID)
    ↓
    ├─→ Claude Models (anthropic.*)
    └─→ Llama Models (meta.*)
    ↓
Execute Request
    ↓
Return Response (with streaming support)
```

### Implementation Files

- **Provider**: [`src/lib/ai/aws-bedrock-provider.ts`](../../src/lib/ai/aws-bedrock-provider.ts) - Bedrock client initialization
- **Models**: [`src/lib/ai/models.ts`](../../src/lib/ai/models.ts) - Model definitions
- **Environment**: `.env` - AWS credentials

---

## Setup Instructions

### 1. Obtain AWS Bedrock Access

1. **AWS Account**: You need an active AWS account
2. **Enable Bedrock**: Go to AWS Console → Bedrock → Model Access
3. **Request Access**: Enable access for models you want to use
4. **Wait for Approval**: Usually instant for most models

### 2. Create IAM User/Role

**Required Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

**For Inference Profiles, also add:**
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:GetInferenceProfile",
    "bedrock:ListInferenceProfiles"
  ],
  "Resource": "*"
}
```

### 3. Generate Access Keys

1. Go to IAM → Users → Your User → Security Credentials
2. Create Access Key
3. Download and save securely
4. Add to `.env` file

### 4. Select Region

**Recommended Regions:**
- `us-east-1` (US East - N. Virginia) - Most models available
- `us-west-2` (US West - Oregon) - Good alternative

**Check Model Availability:**
```bash
aws bedrock list-inference-profiles --region us-east-1
```

---

## Testing

### Test with Temporary Credentials

Example format for temporary credentials (these expire):
```env
AWS_ACCESS_KEY_ID=ASIA<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
AWS_SESSION_TOKEN=<your-session-token>
AWS_REGION=us-east-1
```

Note: Obtain valid temporary credentials from AWS STS (Security Token Service) or your organization's credential provider.

### Verification Steps

1. **Credentials Load**: Check no authentication errors on startup
2. **Model Selection**: Select a Bedrock model in UI dropdown
3. **Basic Chat**: Send a simple message
4. **Tool Calling**: Test MCP tools with Claude models (if configured)
5. **Image Input**: Upload an image with Claude models
6. **Error Handling**: Try with invalid credentials to see error messages

### Troubleshooting

**Error: "Model access denied"**
- Enable model access in AWS Bedrock console
- Check IAM permissions include `bedrock:InvokeModel`

**Error: "Credentials not found"**
- Verify `.env` file has all required variables
- Restart the development server

**Error: "Session token expired"**
- Temporary credentials expired
- Generate new session token
- Update `.env` and restart

**Error: "Region not supported"**
- Model not available in your region
- Try `us-east-1` or check availability

---

## Cost Considerations

### Claude Models (via Bedrock)
- **Input tokens**: Varies by model ($0.003 - $0.015 per 1K tokens)
- **Output tokens**: Varies by model ($0.015 - $0.075 per 1K tokens)
- **Image inputs**: Additional cost per image

### Llama Models (via Bedrock)
- **Input tokens**: $0.0002 - $0.0008 per 1K tokens
- **Output tokens**: $0.0002 - $0.0008 per 1K tokens
- **Generally cheaper than Claude**

### Cost Optimization Tips

1. **Use smaller models** when appropriate (Haiku, Llama 3.2 1B)
2. **Monitor usage** via AWS Cost Explorer
3. **Set billing alerts** in AWS console
4. **Consider direct API** if only using Claude (may be cheaper)

---

## Discovering Available Models

### List All Foundation Models
```bash
aws bedrock list-foundation-models --region us-east-1
```

### List All Inference Profiles (Recommended)
```bash
aws bedrock list-inference-profiles --region us-east-1
```

### Check Model Access
```bash
aws bedrock get-model-invocation-logging-configuration --region us-east-1
```

---

## Security Best Practices

1. **Never Commit Credentials**
   - Always use `.env` (already in `.gitignore`)
   - Never hardcode in source files

2. **Use Temporary Credentials in Production**
   - Rotate credentials regularly
   - Use IAM roles when possible

3. **Restrict Permissions**
   - Only grant necessary Bedrock permissions
   - Use resource-specific policies when possible

4. **Region Restrictions**
   - Configure only required regions
   - Monitor cross-region requests

5. **Error Messages**
   - Don't expose credential details in logs
   - Sanitize error messages before showing to users

6. **Usage Monitoring**
   - Enable CloudTrail for API calls
   - Set up billing alerts
   - Review access patterns regularly

---

## Model Capabilities Comparison

| Model Family | Size Range | Tool Calling | Image Input | Best For |
|--------------|------------|--------------|-------------|----------|
| Claude 4.5 | Large | ✅ Yes | ✅ Yes | Most capable, latest generation |
| Claude 4.1/4 | Large | ✅ Yes | ✅ Yes | Highly capable, production-ready |
| Claude 3.7 | Large | ✅ Yes | ✅ Yes | Enhanced capabilities |
| Claude 3.5 | Medium-Large | ✅ Yes | ✅ Yes | Balanced performance |
| Claude 3 | Small-Large | ✅ Yes | ✅ Yes | Proven, reliable |
| Llama 4 | 17B | ❌ No | ❌ No | Open source, efficient |
| Llama 3.3 | 70B | ❌ No | ❌ No | Large open source |
| Llama 3.2 | 1B-90B | ❌ No | ❌ No | Various sizes |
| Llama 3.1 | 8B-70B | ❌ No | ❌ No | Balanced open source |
| Llama 3 | 8B-70B | ❌ No | ❌ No | Established open source |

---

## Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Bedrock Model Access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
- [Inference Profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

---

## Future Enhancements

Potential improvements for Bedrock integration:

- [ ] Support for additional Bedrock models (Mistral, Titan, Cohere)
- [ ] Automatic credential refresh for temporary tokens
- [ ] Cross-region model failover
- [ ] Cost tracking and usage analytics dashboard
- [ ] Bedrock-specific optimizations (caching, batching)
- [ ] Model performance benchmarking
- [ ] Custom model fine-tuning integration

---

**Last Updated**: 2025-10-17  
**Tested With**: AWS Bedrock API, all 26 models confirmed working