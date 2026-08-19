const DEFAULT_ASSEMBLYAI_BASE_URL = "https://api.eu.assemblyai.com";

const ASSEMBLYAI_POLL_INTERVAL_MS = 1500;
const ASSEMBLYAI_TIMEOUT_MS = 45000;

type AssemblyAIUploadResponse = {
  upload_url?: string;
};

type AssemblyAISubmitResponse = {
  id?: string;
  error?: string;
};

type AssemblyAIPollResponse = {
  status?: "queued" | "processing" | "completed" | "error";
  text?: string | null;
  language_code?: string | null;
  language_confidence?: number | null;
  confidence?: number | null;
  error?: string | null;
};

export type AssemblyAITranscriptionResult = {
  text: string;
  language?: string;
  confidence?: number;
  transcriptId: string;
};

function getAssemblyAIConfig() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ASSEMBLYAI_API_KEY is not configured");
  }

  const baseUrl = (
    process.env.ASSEMBLYAI_API_BASE_URL ?? DEFAULT_ASSEMBLYAI_BASE_URL
  ).replace(/\/$/, "");

  return { apiKey, baseUrl };
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  let parsed: unknown = {};
  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = { error: body };
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" &&
      parsed &&
      "error" in parsed &&
      typeof parsed.error === "string"
        ? parsed.error
        : `AssemblyAI request failed with ${response.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export async function transcribeAudioWithAssemblyAI({
  audio,
  language,
}: {
  audio: ArrayBuffer;
  language?: string | null;
}): Promise<AssemblyAITranscriptionResult> {
  const { apiKey, baseUrl } = getAssemblyAIConfig();
  const headers = { Authorization: apiKey };

  const upload = await fetch(`${baseUrl}/v2/upload`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/octet-stream",
    },
    body: audio,
  });
  const uploadJson = await readJsonResponse<AssemblyAIUploadResponse>(upload);
  if (!uploadJson.upload_url) {
    throw new Error("AssemblyAI upload did not return upload_url");
  }

  const normalizedLanguage = language?.trim();
  const submit = await fetch(`${baseUrl}/v2/transcript`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: uploadJson.upload_url,
      speech_models: ["universal-3-pro", "universal-2"],
      language_detection: !normalizedLanguage,
      ...(normalizedLanguage ? { language_code: normalizedLanguage } : {}),
      format_text: true,
      punctuate: true,
    }),
  });
  const submitJson = await readJsonResponse<AssemblyAISubmitResponse>(submit);
  if (!submitJson.id) {
    throw new Error(
      submitJson.error || "AssemblyAI did not return transcript id",
    );
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < ASSEMBLYAI_TIMEOUT_MS) {
    const poll = await fetch(`${baseUrl}/v2/transcript/${submitJson.id}`, {
      headers,
    });
    const transcript = await readJsonResponse<AssemblyAIPollResponse>(poll);

    if (transcript.status === "completed") {
      return {
        text: transcript.text?.trim() ?? "",
        language: transcript.language_code ?? undefined,
        confidence:
          transcript.confidence ?? transcript.language_confidence ?? undefined,
        transcriptId: submitJson.id,
      };
    }

    if (transcript.status === "error") {
      throw new Error(transcript.error || "AssemblyAI transcription failed");
    }

    await sleep(ASSEMBLYAI_POLL_INTERVAL_MS);
  }

  throw new Error("AssemblyAI transcription timed out");
}
