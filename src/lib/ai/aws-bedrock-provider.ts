import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

/**
 * Configuration for AWS Bedrock provider
 */
interface BedrockConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string; // Optional for temporary credentials
}

/**
 * Create an AWS Bedrock provider with the given configuration
 * Supports both temporary credentials (with session token) and permanent credentials
 *
 * @param config - Optional configuration. If not provided, will use environment variables
 * @returns A function that creates Bedrock models
 */
export function createBedrockProvider(config?: BedrockConfig) {
  // Use config values or fallback to environment variables
  const region = config?.region || process.env.AWS_REGION || "us-east-1";
  const accessKeyId = config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = config?.sessionToken || process.env.AWS_SESSION_TOKEN;

  // Validate required credentials
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS Bedrock requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY",
    );
  }

  // Create the Bedrock provider with credentials
  const bedrockProvider = createAmazonBedrock({
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken, // Will be undefined for permanent credentials, which is fine
  });

  // Return a function that creates models
  return (modelId: string) => bedrockProvider(modelId);
}
