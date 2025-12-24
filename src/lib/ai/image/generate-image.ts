"use server";
import {
  GoogleGenAI,
  Part as GeminiPart,
  Content as GeminiMessage,
} from "@google/genai";
import { safe, watchError } from "ts-safe";
import { getBase64Data } from "lib/file-storage/storage-utils";
import { serverFileStorage } from "lib/file-storage";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

import {
  FilePart,
  ImagePart,
  ModelMessage,
  TextPart,
  experimental_generateImage,
} from "ai";
import { isString } from "lib/utils";
import logger from "logger";

type GenerateImageOptions = {
  messages?: ModelMessage[];
  prompt: string;
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
    model: openai.image("gpt-image-1-mini"),
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
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  const geminiMessages: GeminiMessage[] = await safe(options.messages || [])
    .map((messages) => Promise.all(messages.map(convertToGeminiMessage)))
    .watch(watchError(logger.error))
    .unwrap();
  if (options.prompt) {
    geminiMessages.push({
      role: "user",
      parts: [{ text: options.prompt }],
    });
  }
  const response = await ai.models
    .generateContent({
      model: "gemini-2.5-flash-image",
      config: {
        abortSignal: options.abortSignal,
        responseModalities: ["IMAGE"],
      },
      contents: geminiMessages,
    })
    .catch((err) => {
      logger.error(err);
      throw err;
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

async function convertToGeminiMessage(
  message: ModelMessage,
): Promise<GeminiMessage> {
  const getBase64DataSmart = async (input: {
    data: string | Uint8Array | ArrayBuffer | Buffer | URL;
    mimeType: string;
  }): Promise<{ data: string; mimeType: string }> => {
    if (
      typeof input.data === "string" &&
      (input.data.startsWith("http://") || input.data.startsWith("https://"))
    ) {
      // Try fetching directly (public URLs)
      try {
        const resp = await fetch(input.data);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          return { data: buf.toString("base64"), mimeType: input.mimeType };
        }
      } catch {
        // fall through to storage fallback
      }

      // Fallback: derive key and download via storage backend (works for private buckets)
      try {
        const u = new URL(input.data as string);
        const key = decodeURIComponent(u.pathname.replace(/^\//, ""));
        const buf = await serverFileStorage.download(key);
        return { data: buf.toString("base64"), mimeType: input.mimeType };
      } catch {
        // Ignore and fall back to generic helper below
      }
    }

    // Default fallback: use generic helper (handles base64, buffers, blobs, etc.)
    return getBase64Data(input);
  };
  const parts = isString(message.content)
    ? ([{ text: message.content }] as GeminiPart[])
    : await Promise.all(
        message.content.map(async (content) => {
          if (content.type == "file") {
            const part = content as FilePart;
            const data = await getBase64DataSmart({
              data: part.data,
              mimeType: part.mediaType!,
            });
            return {
              inlineData: data,
            } as GeminiPart;
          }
          if (content.type == "text") {
            const part = content as TextPart;
            return {
              text: part.text,
            };
          }
          if (content.type == "image") {
            const part = content as ImagePart;
            const data = await getBase64DataSmart({
              data: part.image,
              mimeType: part.mediaType!,
            });
            return {
              inlineData: data,
            };
          }
          return null;
        }),
      )
        .then((parts) => parts.filter(Boolean) as GeminiPart[])
        .catch((err) => {
          logger.withTag("convertToGeminiMessage").error(err);
          throw err;
        });

  return {
    role: message.role == "user" ? "user" : "model",
    parts,
  };
}
