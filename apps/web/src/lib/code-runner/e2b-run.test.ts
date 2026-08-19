import { afterEach, describe, expect, test, vi } from "vitest";

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }));

vi.mock("lib/file-storage", () => ({
  serverFileStorage: { upload: uploadMock },
}));
vi.mock("lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import type { E2BArtifact, LogEntry } from "./code-runner.interface";
import { persistArtifacts, stageFiles } from "./e2b-run";

afterEach(() => vi.clearAllMocks());

function b64(s: string) {
  return Buffer.from(s).toString("base64");
}

describe("persistArtifacts", () => {
  test("uploads base64 artifacts and swaps in a durable download URL (dropping base64)", async () => {
    uploadMock.mockResolvedValue({
      key: "user-1/uuid-report.pdf",
      sourceUrl: "https://cdn.example.com/report.pdf",
      metadata: {},
    });
    const artifacts: E2BArtifact[] = [
      {
        filename: "report.pdf",
        mimeType: "application/pdf",
        contentBase64: b64("PDF"),
      },
    ];

    const [out] = await persistArtifacts(artifacts, "user-1");

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "application/pdf",
        filename: "report.pdf",
        userId: "user-1",
        uploadType: "attachment",
      }),
    );
    // The persisted URL must be the authenticated app route, not a bucket
    // URL — public/signed bucket URLs break after refresh or expiry.
    expect(out.url).toBe(
      `/api/storage/download?key=${encodeURIComponent("user-1/uuid-report.pdf")}`,
    );
    expect(out.contentBase64).toBeUndefined();
  });

  test("keeps base64 as a fallback when the upload fails", async () => {
    uploadMock.mockRejectedValue(new Error("storage down"));
    const artifacts: E2BArtifact[] = [
      { filename: "data.csv", mimeType: "text/csv", contentBase64: b64("a,b") },
    ];

    const [out] = await persistArtifacts(artifacts);

    expect(out.url).toBeUndefined();
    expect(out.contentBase64).toBe(b64("a,b"));
  });

  test("leaves artifacts without base64 untouched (no upload)", async () => {
    const artifacts: E2BArtifact[] = [
      { filename: "x.png", mimeType: "image/png", url: "https://cdn/x.png" },
    ];

    const [out] = await persistArtifacts(artifacts);

    expect(uploadMock).not.toHaveBeenCalled();
    expect(out.url).toBe("https://cdn/x.png");
  });
});

describe("stageFiles", () => {
  test("writes an uploaded CSV into the interpreter working directory", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const logs: LogEntry[] = [];

    const staged = await stageFiles(
      { files: { write } } as never,
      [
        {
          filename: "account-statement_21-Oct-2025_04-Aug-2026.csv",
          bytes: Buffer.from("date,revenue\n2026-08-01,42\n"),
        },
      ],
      logs,
    );

    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toBe(
      "/home/user/account-statement_21-Oct-2025_04-Aug-2026.csv",
    );
    expect(Buffer.from(write.mock.calls[0][1] as ArrayBuffer).toString()).toBe(
      "date,revenue\n2026-08-01,42\n",
    );
    expect(staged).toEqual(["account-statement_21-Oct-2025_04-Aug-2026.csv"]);
    expect(logs[0]?.args[0]).toEqual({
      type: "data",
      value:
        "Staged attachment in /home/user: account-statement_21-Oct-2025_04-Aug-2026.csv",
    });
  });
});
