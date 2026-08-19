import { describe, expect, it, vi } from "vitest";
import { buildCsvIngestionPreviewParts } from "./csv-ingest";
import type { ChatAttachment } from "app-types/chat";

const attachmentFactory = (
  overrides: Partial<ChatAttachment> = {},
): ChatAttachment => ({
  type: "source-url",
  url: "https://example.com/uploads/data.csv",
  mediaType: "text/csv",
  filename: "data.csv",
  ...overrides,
});

describe("buildCsvIngestionPreviewParts", () => {
  it("returns preview text for csv attachments", async () => {
    const attachments = [attachmentFactory()];
    const download = vi.fn(async () =>
      Buffer.from("col1,col2\n1,2\n3,4\n", "utf8"),
    );

    const parts = await buildCsvIngestionPreviewParts(attachments, download);

    expect(parts).toHaveLength(1);
    expect(parts[0].type).toBe("text");
    expect(parts[0].ingestionPreview).toBe(true);
    expect(parts[0].text).toContain("rows: 3");
    expect(parts[0].text).toContain("| col1 | col2 |");
  });

  it("skips attachments that are not csv-like", async () => {
    const attachments = [
      attachmentFactory({
        mediaType: "application/json",
        filename: "data.json",
      }),
    ];
    const download = vi.fn();

    const parts = await buildCsvIngestionPreviewParts(attachments, download);

    expect(parts).toHaveLength(0);
    expect(download).not.toHaveBeenCalled();
  });

  it("ignores attachments with invalid URLs", async () => {
    const attachments = [attachmentFactory({ url: "not-a-url" })];
    const download = vi.fn();

    const parts = await buildCsvIngestionPreviewParts(attachments, download);

    expect(parts).toHaveLength(0);
    expect(download).not.toHaveBeenCalled();
  });

  it("continues when download fails", async () => {
    const attachments = [attachmentFactory()];
    const download = vi.fn(async () => {
      throw new Error("network");
    });

    const parts = await buildCsvIngestionPreviewParts(attachments, download);

    expect(parts).toHaveLength(0);
    expect(download).toHaveBeenCalled();
  });
});
