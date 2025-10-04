import { FilePart, ImagePart, tool as createTool } from "ai";
import { generateImageWithNanoBanana } from "lib/ai/image/generate-image";
import { serverFileStorage } from "lib/file-storage";
import { isString } from "lib/utils";
import { safe } from "ts-safe";
import z from "zod";
import { ImageToolName } from "..";

export const nanoBananaTool = createTool({
  name: ImageToolName,
  description:
    "Generate, transform, or edit images using AI. Automatically uses up to 2 recent uploaded images as reference when available.",
  inputSchema: z.object({
    prompt: z.string().describe(
      `Detailed description of the image to generate or transformation to apply.
Include: subject, style (photorealistic/artistic/cartoon), colors, mood, and specific details.
If modifying reference images, describe the desired changes clearly.`,
    ),
  }),
  execute: async (input, { messages, abortSignal }) => {
    const referenceImages = messages.slice(-6).flatMap((message) => {
      if (isString(message.content)) return [];
      return message.content
        .map((part) => {
          if (part?.type !== "file" && part?.type !== "image") return undefined;
          if (part.type === "file") {
            const p = part as FilePart;
            return {
              mimeType: p.mediaType,
              data: p.data,
            };
          }
          if (part.type === "image") {
            const p = part as ImagePart;
            return {
              mimeType: p.mediaType,
              data: p.image,
            };
          }
        })
        .filter(Boolean) as { mimeType: string; data: string }[];
    });

    const images = await generateImageWithNanoBanana({
      prompt: input.prompt,
      abortSignal,
      referenceImages: referenceImages.slice(-2),
    });

    const resultImages = await safe(images.images)
      .map((images) => {
        return Promise.all(
          images.map(async (image) => {
            const uploadedImage = await serverFileStorage.upload(
              Buffer.from(image.base64),
              {
                contentType: image.mimeType,
              },
            );
            return {
              url: uploadedImage.sourceUrl,
              mimeType: image.mimeType,
            };
          }),
        );
      })
      .orElse(
        images.images.map((v) => ({
          url: `data:${v.mimeType || "image/png"};base64,${v.base64}`,
          mimeType: v.mimeType,
        })),
      );

    return {
      images: resultImages,
      guide:
        "The generated images are now displayed to the user. Please provide a brief introduction to the images or ask if any modifications are needed.",
    };
  },
});
