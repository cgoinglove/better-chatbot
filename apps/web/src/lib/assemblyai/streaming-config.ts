export const ASSEMBLYAI_EU_STREAMING_WS_URL =
  "wss://streaming.eu.assemblyai.com/v3/ws";

export const ASSEMBLYAI_STREAMING_SAMPLE_RATE = 16_000;

export const DEFAULT_ASSEMBLYAI_STREAMING_MODEL = "universal-3-5-pro";

/** Bias German recognition; not a hard language lock. */
export const DEFAULT_ASSEMBLYAI_STREAMING_LANGUAGE = "de";

export const ASSEMBLYAI_DICTATION_KEYTERMS = [
  "senden",
  "abschicken",
  "nachricht",
  "Keinsaas",
  "Navigator",
  "Workflow",
  "Agent",
  "Projekt",
] as const;

export function getAssemblyAIStreamingModel(): string {
  const configured = process.env.NEXT_PUBLIC_ASSEMBLYAI_STREAMING_MODEL?.trim();
  return configured || DEFAULT_ASSEMBLYAI_STREAMING_MODEL;
}

export type AssemblyAIStreamingConnectionParams = {
  token: string;
  speechModel?: string;
  languageCode?: string;
  keyterms?: readonly string[];
  sampleRate?: number;
};

export function buildAssemblyAIStreamingUrl({
  token,
  speechModel = getAssemblyAIStreamingModel(),
  languageCode = DEFAULT_ASSEMBLYAI_STREAMING_LANGUAGE,
  keyterms = ASSEMBLYAI_DICTATION_KEYTERMS,
  sampleRate = ASSEMBLYAI_STREAMING_SAMPLE_RATE,
}: AssemblyAIStreamingConnectionParams): string {
  const params = new URLSearchParams({
    speech_model: speechModel,
    sample_rate: String(sampleRate),
    encoding: "pcm_s16le",
    language_code: languageCode,
    keyterms_prompt: JSON.stringify([...keyterms]),
    token,
  });

  return `${ASSEMBLYAI_EU_STREAMING_WS_URL}?${params.toString()}`;
}

export function convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

export function resampleFloat32ToTargetRate(
  input: Float32Array,
  inputRate: number,
  targetRate: number,
): Float32Array {
  if (inputRate === targetRate || input.length === 0) {
    return input;
  }

  const ratio = inputRate / targetRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const idx = Math.floor(srcIndex);
    const frac = srcIndex - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[idx + 1] ?? s0;
    output[i] = s0 + (s1 - s0) * frac;
  }

  return output;
}

export function preparePcmChunkForAssemblyAI(
  float32Audio: Float32Array,
  inputSampleRate: number,
  targetSampleRate = ASSEMBLYAI_STREAMING_SAMPLE_RATE,
): ArrayBuffer {
  const resampled = resampleFloat32ToTargetRate(
    float32Audio,
    inputSampleRate,
    targetSampleRate,
  );
  return convertFloat32ToInt16(resampled).buffer as ArrayBuffer;
}
