"use server";

import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

import { GeneratedFile, experimental_generateImage, generateText } from "ai";

type GenerateImageOptions = {
  prompt: string;
  n?: number;
  abortSignal?: AbortSignal;
};

export async function generateImageWithOpenAI(
  options: GenerateImageOptions,
): Promise<GeneratedFile[]> {
  return experimental_generateImage({
    model: openai.image("gpt-image-1"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
    n: options.n,
  }).then((res) => res.images);
}

export async function generateImageWithXAI(
  options: GenerateImageOptions,
): Promise<GeneratedFile[]> {
  return experimental_generateImage({
    model: xai.image("grok-2-image"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
    n: options.n,
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
