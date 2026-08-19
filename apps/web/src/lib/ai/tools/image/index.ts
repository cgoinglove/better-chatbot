import { trackUsage } from "@/lib/gate";
import { FilePart, ModelMessage, ToolResultPart, tool as createTool } from "ai";
import { generateImageWithGemini } from "lib/ai/image/generate-image";
import { serverFileStorage } from "lib/file-storage";
import { toAny } from "lib/utils";
import logger from "logger";
import { safe, watchError } from "ts-safe";
import z from "zod";
import { ImageToolName } from "..";

export type ImageToolResult = {
  images: {
    url: string;
    mimeType?: string;
  }[];
  mode?: "create" | "edit" | "composite";
  guide?: string;
  model: string;
};

/**
 * Factory function to create image generation tool with userId and threadId bound
 * Image generation tool using Google Gemini 2.5 Flash Image via AI Gateway
 * Automatically tracks token usage through Autumn billing system
 */
export const createImageTool = (
  billingCustomerId?: string | null,
  threadId?: string,
  billingEntityId?: string,
) =>
  createTool({
    description: `Generate, edit, or composite images based on the conversation context. This tool automatically analyzes recent messages to create images without requiring explicit input parameters. It includes all user-uploaded images from the recent conversation and only the most recent AI-generated image to avoid confusion. Use the 'mode' parameter to specify the operation type: 'create' for new images, 'edit' for modifying existing images, or 'composite' for combining multiple images. Use this when the user requests image creation, modification, or visual content generation.`,
    inputSchema: z.object({
      mode: z
        .enum(["create", "edit", "composite"])
        .optional()
        .default("create")
        .describe(
          "Image generation mode: 'create' for new images, 'edit' for modifying existing images, 'composite' for combining multiple images",
        ),
    }),
    execute: async ({ mode }, options) => {
      const { messages, abortSignal, toolCallId } = options;
      try {
        let hasFoundImage = false;

        // Get latest 6 messages and extract only the most recent image for editing context
        // This prevents multiple image references that could confuse the image generation model
        const latestMessages = messages
          .slice(-6)
          .reverse()
          .map((m) => {
            if (m.role != "tool") return m;
            if (hasFoundImage) return m; // Skip if we already found an image
            const fileParts = m.content.flatMap(
              convertToImageToolPartToFilePart,
            );
            if (fileParts.length === 0) return m;
            hasFoundImage = true; // Mark that we found the most recent image
            return {
              ...m,
              role: "assistant",
              content: fileParts,
            };
          })
          .filter((v) => Boolean(v?.content?.length))
          .reverse() as ModelMessage[];

        logger.info(
          `[Image Tool] Generating image with ${latestMessages.length} context messages`,
        );

        // Generate image via AI Gateway (with automatic usage tracking)
        const imageResult = await generateImageWithGemini({
          prompt: "",
          abortSignal,
          messages: latestMessages,
          customerId: billingCustomerId ?? undefined,
          threadId: threadId,
        });

        // Track token usage for billing
        if (imageResult.usage && billingCustomerId) {
          const { inputTokens, outputTokens } = imageResult.usage;
          logger.info(
            `[Image Tool] Tracking usage - Input: ${inputTokens}, Output: ${outputTokens}`,
          );

          try {
            await trackUsage({
              kind: "tokens",
              customerId: billingCustomerId ?? undefined,
              entityId: billingEntityId,
              modelId: "google/gemini-2.5-flash-image",
              promptTokens: inputTokens,
              completionTokens: outputTokens,
              idempotencyKey: `image-${billingCustomerId}-${toolCallId}`,
              properties: {
                threadId: threadId,
                imageGeneration: true,
                mode: mode,
              },
            });
            logger.info(`[Image Tool] Token usage tracked successfully`);
          } catch (err) {
            logger.error("[Image Tool] Failed to track token usage:", err);
          }
        }

        // Upload generated images to storage
        const resultImages = await safe(imageResult.images)
          .map((images) => {
            return Promise.all(
              images.map(async (image) => {
                const uploadedImage = await serverFileStorage.upload(
                  Buffer.from(image.base64, "base64"),
                  {
                    contentType: image.mimeType,
                    filename: `ai-generated-${Date.now()}.png`,
                    userId: billingCustomerId ?? undefined,
                    uploadType: "ai-generated",
                  },
                );
                return {
                  url: uploadedImage.sourceUrl,
                  mimeType: image.mimeType,
                };
              }),
            );
          })
          .watch(
            watchError((e) => {
              logger.error(e);
              logger.info(`upload image failed. using base64`);
            }),
          )
          .ifFail(() => {
            throw new Error(
              "Image generation was successful, but file upload failed. Please check your file upload configuration and try again.",
            );
          })
          .unwrap();

        return {
          images: resultImages,
          mode,
          model: "gemini-2.5-flash-image",
          guide:
            resultImages.length > 0
              ? "The image has been successfully generated and is now displayed above. If you need any edits, modifications, or adjustments to the image, please let me know."
              : "I apologize, but the image generation was not successful. To help me create a better image for you, could you please provide more specific details about what you'd like to see? For example:\n\n• What style are you looking for? (realistic, cartoon, abstract, etc.)\n• What colors or mood should the image have?\n• Are there any specific objects, people, or scenes you want included?\n• What size or format would work best for your needs?\n\nPlease share these details and I'll try generating the image again with your specifications.",
        };
      } catch (e) {
        logger.error(e);
        throw e;
      }
    },
  });

function convertToImageToolPartToFilePart(
  part: ToolResultPart | { type: string },
): FilePart[] {
  if (!("toolName" in part)) return [];
  if (part.toolName !== ImageToolName) return [];
  const output = toAny(part).output;
  // In AI SDK 6, output can be either the value directly or wrapped with type
  const result = (output?.value || output) as ImageToolResult;
  if (!result?.images?.length) return [];
  return result.images.map((image) => ({
    type: "file",
    mediaType: image.mimeType!,
    data: image.url,
  }));
}
