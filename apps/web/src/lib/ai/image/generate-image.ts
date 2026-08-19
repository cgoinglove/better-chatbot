"use server";
import { ModelMessage, generateText } from "ai";
import logger from "logger";
import { aiTelemetry } from "lib/ai/telemetry";

type GenerateImageOptions = {
  messages?: ModelMessage[];
  prompt: string;
  abortSignal?: AbortSignal;
  customerId?: string; // For token tracking
  threadId?: string; // For token tracking
};

type GeneratedImage = {
  base64: string;
  mimeType?: string;
};

export type GeneratedImageResult = {
  images: GeneratedImage[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

/**
 * Generate images using Google Gemini 2.5 Flash Image via AI Gateway
 * This routes through AI Gateway for automatic token tracking and cost management
 */
export const generateImageWithGemini = async (
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> => {
  try {
    // Build messages array
    const messages: ModelMessage[] = [...(options.messages || [])];

    // Add prompt as final user message if provided
    if (options.prompt) {
      messages.push({
        role: "user",
        content: options.prompt,
      });
    }

    logger.info(
      `[Image Gen] Generating image via AI Gateway with ${messages.length} messages`,
    );

    // Use AI Gateway with Gemini 2.5 Flash Image
    // The string model ID is handled by the global AI Gateway provider
    const result = await generateText({
      model: "google/gemini-2.5-flash-image",
      experimental_telemetry: aiTelemetry("image.generate", {
        modelId: "google/gemini-2.5-flash-image",
      }),
      providerOptions: {
        google: {
          responseModalities: ["IMAGE"], // Request only images
        },
      },
      messages,
      abortSignal: options.abortSignal,
      // Note: Token tracking happens via the tool's onFinish callback
      // in the main chat route, not here
    });

    logger.info(`[Image Gen] Generated ${result.files?.length || 0} files`);

    // Extract images from result.files
    const imageFiles =
      result.files?.filter((f) => f.mediaType?.startsWith("image/")) || [];

    const images: GeneratedImage[] = imageFiles.map((file) => ({
      base64: Buffer.from(file.uint8Array).toString("base64"),
      mimeType: file.mediaType,
    }));

    return {
      images,
      usage: {
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      },
    };
  } catch (err) {
    logger.error("[Image Gen] Failed to generate image:", err);
    throw err;
  }
};
