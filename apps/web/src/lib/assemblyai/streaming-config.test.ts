import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ASSEMBLYAI_DICTATION_KEYTERMS,
  ASSEMBLYAI_STREAMING_SAMPLE_RATE,
  buildAssemblyAIStreamingUrl,
  convertFloat32ToInt16,
  DEFAULT_ASSEMBLYAI_STREAMING_MODEL,
  getAssemblyAIStreamingModel,
  preparePcmChunkForAssemblyAI,
  resampleFloat32ToTargetRate,
} from "./streaming-config";

describe("buildAssemblyAIStreamingUrl", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds an EU streaming URL with Universal-3.5 Pro defaults", () => {
    const url = buildAssemblyAIStreamingUrl({ token: "test-token" });
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(
      "wss://streaming.eu.assemblyai.com/v3/ws",
    );
    expect(parsed.searchParams.get("speech_model")).toBe(
      DEFAULT_ASSEMBLYAI_STREAMING_MODEL,
    );
    expect(parsed.searchParams.get("sample_rate")).toBe(
      String(ASSEMBLYAI_STREAMING_SAMPLE_RATE),
    );
    expect(parsed.searchParams.get("encoding")).toBe("pcm_s16le");
    expect(parsed.searchParams.get("language_code")).toBe("de");
    expect(parsed.searchParams.get("token")).toBe("test-token");
    expect(parsed.searchParams.get("format_turns")).toBeNull();

    const keyterms = JSON.parse(
      parsed.searchParams.get("keyterms_prompt") ?? "[]",
    );
    expect(keyterms).toEqual([...ASSEMBLYAI_DICTATION_KEYTERMS]);
  });

  it("allows overriding the speech model via NEXT_PUBLIC env", () => {
    vi.stubEnv("NEXT_PUBLIC_ASSEMBLYAI_STREAMING_MODEL", "u3-rt-pro");

    expect(getAssemblyAIStreamingModel()).toBe("u3-rt-pro");

    const url = buildAssemblyAIStreamingUrl({ token: "test-token" });
    expect(new URL(url).searchParams.get("speech_model")).toBe("u3-rt-pro");
  });
});

describe("audio resampling helpers", () => {
  it("returns the same buffer when sample rates match", () => {
    const input = new Float32Array([0, 0.5, 1]);
    const output = resampleFloat32ToTargetRate(input, 16_000, 16_000);
    expect(output).toBe(input);
  });

  it("downsamples float audio to the target rate", () => {
    const input = new Float32Array([0, 1, 0, -1]);
    const output = resampleFloat32ToTargetRate(input, 32_000, 16_000);

    expect(output.length).toBe(2);
    expect(output[0]).toBeCloseTo(0, 5);
    expect(output[1]).toBeCloseTo(0, 5);
  });

  it("converts float samples to 16-bit PCM", () => {
    const pcm = convertFloat32ToInt16(new Float32Array([0, 1, -1]));
    expect(Array.from(pcm)).toEqual([0, 32_767, -32_768]);
  });

  it("prepares resampled PCM chunks for AssemblyAI", () => {
    const buffer = preparePcmChunkForAssemblyAI(
      new Float32Array([0, 1, 0, -1]),
      32_000,
    );

    expect(buffer.byteLength).toBe(4);
  });
});
