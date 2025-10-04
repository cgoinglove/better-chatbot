"use server";

import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

import { GeneratedFile, experimental_generateImage, generateText } from "ai";

type GenerateImageOptions = {
  prompt: string;
  referenceImages?: { mimeType: string; url?: string; base64?: string }[];
  abortSignal?: AbortSignal;
};

type GeneratedImage = {
  content: UploadContent;
  mimeType?: string;
};

type GeneratedImageResult = {
  images: GeneratedImage[];
  text?: string;
};

export async function generateImageWithOpenAI(
  options: GenerateImageOptions,
): Promise<GeneratedFile[]> {
  return experimental_generateImage({
    model: openai.image("gpt-image-1"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
  }).then((res) => res.images);
}

export async function generateImageWithXAI(
  options: GenerateImageOptions,
): Promise<GeneratedFile[]> {
  return experimental_generateImage({
    model: xai.image("grok-2-image"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
  }).then((res) => res.images);
}

export async function generateImageWithGoogle(
  options: GenerateImageOptions,
): Promise<GeneratedFile[]> {
  const result = await generateText({
    model: google("gemini-2.5-flash-image-preview"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
  });
  return result.files;
}

import { GoogleGenAI, Part as GeminiPart } from "@google/genai";
import { safe } from "ts-safe";
import { UploadContent } from "lib/file-storage/file-storage.interface";

async function getBase64Data(image: {
  mimeType: string;
  url?: string;
  base64?: string;
}): Promise<{ base64: string; mimeType: string }> {
  if (image.base64) {
    return {
      base64: image.base64,
      mimeType: image.mimeType,
    };
  }
  if (image.url) {
    const response = await fetch(image.url);
    const buffer = await response.arrayBuffer();
    return {
      base64: Buffer.from(buffer).toString("base64"),
      mimeType: image.mimeType,
    };
  }
  throw new Error("No image data provided");
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
        images.map(async (image) => await getBase64Data(image)) as GeminiPart[],
      ),
    )
    .unwrap();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "system",
        parts: [
          {
            text: `You are a helpful assistant that generates images based on a prompt.  
You must always generate images that are relevant to the prompt and context.  
If the prompt is unclear, you should still generate an image without asking the user for more information.`,
          },
        ],
      },
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
        acc.text += candidate.content?.parts
          ?.filter((part) => part.text)
          .map((p) => p.text);

        const images =
          candidate.content?.parts
            ?.filter((part) => part.inlineData)
            .map((p) => ({
              content: Buffer.from(p.inlineData!.data!, "base64"),
              mimeType: p.inlineData!.mimeType,
            })) ?? [];
        acc.images.push(...images);
        return acc;
      },
      { images: [] as GeneratedImage[], text: "" },
    ) || { images: [] as GeneratedImage[], text: "Empty Images" }
  );
};
