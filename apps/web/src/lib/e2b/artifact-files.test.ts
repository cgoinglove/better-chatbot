import { describe, expect, test, vi } from "vitest";

vi.mock("lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import type { Sandbox } from "@e2b/code-interpreter";
import {
  type ListedFile,
  MAX_ARTIFACT_FILE_BYTES,
  collectGeneratedFiles,
  findGeneratedFiles,
  mimeTypeForFile,
  snapshotListing,
} from "./artifact-files";

function file(name: string, size: number, type = "file"): ListedFile {
  return { name, path: `/home/user/${name}`, type, size };
}

describe("mimeTypeForFile", () => {
  test("maps known extensions", () => {
    expect(mimeTypeForFile("report.pdf")).toBe("application/pdf");
    expect(mimeTypeForFile("data.CSV")).toBe("text/csv");
    expect(mimeTypeForFile("sheet.xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  test("falls back to octet-stream", () => {
    expect(mimeTypeForFile("weird.xyz")).toBe("application/octet-stream");
    expect(mimeTypeForFile("noextension")).toBe("application/octet-stream");
  });
});

describe("snapshotListing / findGeneratedFiles", () => {
  test("detects new files only", () => {
    const before = snapshotListing([file("existing.txt", 10)]);
    const after = [file("existing.txt", 10), file("report.pdf", 1000)];
    expect(findGeneratedFiles(before, after).map((f) => f.name)).toEqual([
      "report.pdf",
    ]);
  });

  test("detects size-changed files", () => {
    const before = snapshotListing([file("data.csv", 10)]);
    const after = [file("data.csv", 999)];
    expect(findGeneratedFiles(before, after)).toHaveLength(1);
  });

  test("ignores directories, hidden and empty files", () => {
    const before = new Map<string, number>();
    const after = [
      file("subdir", 4096, "dir"),
      file(".hidden", 100),
      file("empty.txt", 0),
      file("keep.pdf", 5),
    ];
    expect(findGeneratedFiles(before, after).map((f) => f.name)).toEqual([
      "keep.pdf",
    ]);
  });
});

describe("collectGeneratedFiles", () => {
  function mockSandbox(entries: ListedFile[], content = "PDFDATA") {
    const read = vi.fn().mockResolvedValue(new TextEncoder().encode(content));
    const list = vi.fn().mockResolvedValue(entries);
    return {
      sbx: { files: { list, read } } as unknown as Sandbox,
      read,
      list,
    };
  }

  test("reads new files as base64 artifacts", async () => {
    const { sbx } = mockSandbox([file("report.pdf", 7)]);
    const artifacts = await collectGeneratedFiles(sbx, new Map());
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toMatchObject({
      filename: "report.pdf",
      mimeType: "application/pdf",
    });
    expect(Buffer.from(artifacts[0].contentBase64!, "base64").toString()).toBe(
      "PDFDATA",
    );
  });

  test("skips oversized files but keeps the rest", async () => {
    const { sbx, read } = mockSandbox([
      file("huge.pdf", MAX_ARTIFACT_FILE_BYTES + 1),
      file("small.csv", 7),
    ]);
    const artifacts = await collectGeneratedFiles(sbx, new Map());
    expect(artifacts.map((a) => a.filename)).toEqual(["small.csv"]);
    expect(read).toHaveBeenCalledTimes(1);
  });

  test("returns empty on listing failure instead of throwing", async () => {
    const sbx = {
      files: { list: vi.fn().mockRejectedValue(new Error("boom")) },
    } as unknown as Sandbox;
    await expect(collectGeneratedFiles(sbx, new Map())).resolves.toEqual([]);
  });
});
