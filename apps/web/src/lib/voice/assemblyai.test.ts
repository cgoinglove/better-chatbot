import { beforeEach, describe, expect, it, vi } from "vitest";
import { transcribeAudioWithAssemblyAI } from "./assemblyai";

const fetchMock = vi.fn();

describe("transcribeAudioWithAssemblyAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ASSEMBLYAI_API_KEY", "test-key");
    vi.stubEnv("ASSEMBLYAI_API_BASE_URL", "https://assembly.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  it("uploads audio, submits a transcript job, and returns completed text", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ upload_url: "https://assembly.test/uploaded.wav" }),
      )
      .mockResolvedValueOnce(Response.json({ id: "transcript-1" }))
      .mockResolvedValueOnce(
        Response.json({
          status: "completed",
          text: "Create a task from the Atom.",
          language_code: "en",
          confidence: 0.92,
        }),
      );

    const result = await transcribeAudioWithAssemblyAI({
      audio: new ArrayBuffer(4),
    });

    expect(result).toEqual({
      text: "Create a task from the Atom.",
      language: "en",
      confidence: 0.92,
      transcriptId: "transcript-1",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://assembly.test/v2/transcript",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"speech_models"'),
      }),
    );
  });

  it("requires a server-side AssemblyAI API key", async () => {
    vi.stubEnv("ASSEMBLYAI_API_KEY", "");

    await expect(
      transcribeAudioWithAssemblyAI({ audio: new ArrayBuffer(4) }),
    ).rejects.toThrow("ASSEMBLYAI_API_KEY is not configured");
  });
});
