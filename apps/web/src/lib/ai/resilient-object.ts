import "server-only";
import { generateObject, generateText, type LanguageModel } from "ai";
import type { z } from "zod";
import globalLogger from "logger";
import { aiTelemetry } from "lib/ai/telemetry";

const logger = globalLogger.withDefaults({ message: "Resilient Object: " });

/**
 * Pull a JSON object out of model text that may be wrapped in markdown fences
 * or surrounded by prose — the usual reasons strict generateObject parsing
 * fails ("No object generated: could not parse the response").
 */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("no JSON object found in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * generateObject that survives models with unreliable structured output
 * (e.g. Kimi via the gateway wrapping JSON in fences):
 *
 * 1. strict generateObject on the primary model
 * 2. generateText on the primary model + lenient JSON extraction + schema parse
 * 3. strict generateObject on the fallback model (when provided)
 *
 * Throws the first attempt's error only if every layer fails.
 */
export async function generateObjectResilient<T>(opts: {
  model: LanguageModel | string;
  fallbackModel?: LanguageModel | string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  label?: string;
  /**
   * Bounds all three attempts together. Without it a caller running inside a
   * timed background job can be stuck here for as long as the provider takes,
   * three times over.
   */
  abortSignal?: AbortSignal;
}): Promise<{
  object: T;
  via: "primary" | "text-repair" | "fallback";
}> {
  const label = opts.label ?? "generateObjectResilient";

  let primaryError: unknown;
  try {
    const { object } = await generateObject({
      model: opts.model,
      experimental_telemetry: aiTelemetry("structured.generate", {
        attempt: "primary",
      }),
      abortSignal: opts.abortSignal,
      schema: opts.schema,
      system: opts.system,
      prompt: opts.prompt,
    });
    return { object: object as T, via: "primary" };
  } catch (error) {
    primaryError = error;
    logger.warn(
      `[${label}] strict parse failed, trying text repair:`,
      error instanceof Error ? error.message : error,
    );
  }

  try {
    const { text } = await generateText({
      model: opts.model,
      experimental_telemetry: aiTelemetry("structured.generate", {
        attempt: "text-repair",
      }),
      abortSignal: opts.abortSignal,
      system: `${opts.system}\n\nReturn ONLY a single JSON object. No markdown fences, no explanations, no text before or after the JSON.`,
      prompt: opts.prompt,
    });
    const object = opts.schema.parse(extractJsonObject(text));
    logger.info(`[${label}] recovered via text repair`);
    return { object, via: "text-repair" };
  } catch (error) {
    logger.warn(
      `[${label}] text repair failed:`,
      error instanceof Error ? error.message : error,
    );
  }

  if (opts.fallbackModel) {
    try {
      const { object } = await generateObject({
        model: opts.fallbackModel,
        experimental_telemetry: aiTelemetry("structured.generate", {
          attempt: "fallback-model",
        }),
        abortSignal: opts.abortSignal,
        schema: opts.schema,
        system: opts.system,
        prompt: opts.prompt,
      });
      logger.info(`[${label}] recovered via fallback model`);
      return { object: object as T, via: "fallback" };
    } catch (error) {
      logger.warn(
        `[${label}] fallback model failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  throw primaryError;
}
