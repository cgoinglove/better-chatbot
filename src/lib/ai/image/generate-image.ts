"use server";
import { GoogleGenAI, Part as GeminiPart } from "@google/genai";
import { safe } from "ts-safe";
import { getBase64Data } from "lib/file-storage/storage-utils";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

import { experimental_generateImage } from "ai";
import logger from "logger";

type GenerateImageOptions = {
  prompt: string;
  referenceImages?: {
    mimeType: string;
    data: string | Uint8Array | ArrayBuffer | Buffer | URL;
  }[];
  abortSignal?: AbortSignal;
};

type GeneratedImage = {
  base64: string;
  mimeType?: string;
};

export type GeneratedImageResult = {
  images: GeneratedImage[];
};

export async function generateImageWithOpenAI(
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> {
  return experimental_generateImage({
    model: openai.image("gpt-image-1"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
  }).then((res) => {
    return {
      images: res.images.map((v) => {
        const item: GeneratedImage = {
          base64: Buffer.from(v.uint8Array).toString("base64"),
          mimeType: v.mediaType,
        };
        return item;
      }),
    };
  });
}

export async function generateImageWithXAI(
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> {
  return experimental_generateImage({
    model: xai.image("grok-2-image"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
  }).then((res) => {
    return {
      images: res.images.map((v) => ({
        base64: Buffer.from(v.uint8Array).toString("base64"),
        mimeType: v.mediaType,
      })),
    };
  });
}

export const generateImageWithNanoBanana = async (
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  const prompt = options.prompt;

  const referenceImages: GeminiPart[] = await safe(
    options.referenceImages || [],
  )
    .map(async (images) =>
      Promise.all(
        images.map(
          async (image) =>
            await getBase64Data(image).then((data) => ({
              inlineData: {
                data: data.data,
                mimeType: data.mimeType,
              },
            })),
        ) as GeminiPart[],
      ),
    )
    .unwrap();
  logger.debug("nano banana", {
    prompt,
    referenceImages: referenceImages.length,
  });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    config: {
      abortSignal: options.abortSignal,
      responseModalities: ["IMAGE"],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
          ...referenceImages,
        ],
      },
    ],
  });
  return (
    response.candidates?.reduce(
      (acc, candidate) => {
        const images =
          candidate.content?.parts
            ?.filter((part) => part.inlineData)
            .map((p) => ({
              base64: p.inlineData!.data!,
              mimeType: p.inlineData!.mimeType,
            })) ?? [];
        acc.images.push(...images);
        return acc;
      },
      { images: [] as GeneratedImage[] },
    ) || { images: [] as GeneratedImage[] }
  );
};
