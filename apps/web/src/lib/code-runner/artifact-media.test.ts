import { describe, expect, it } from "vitest";
import { splitArtifactsForDisplay } from "./artifact-media";

const URL_BASE = "https://sb.co/storage/v1/object/public/ai-generated/u";

describe("splitArtifactsForDisplay", () => {
  it("previews a PDF that reached storage", () => {
    const { previewable, downloads } = splitArtifactsForDisplay([
      {
        filename: "report.pdf",
        mimeType: "application/pdf",
        url: `${URL_BASE}/report.pdf`,
      },
    ]);

    expect(previewable).toEqual([
      {
        type: "pdf",
        url: `${URL_BASE}/report.pdf`,
        mimeType: "application/pdf",
        title: "report.pdf",
      },
    ]);
    // Not listed twice — the viewer carries its own download control.
    expect(downloads).toEqual([]);
  });

  it("keeps a PDF that only has base64 as a download", () => {
    // The upload failed, so there is no URL for an iframe to point at.
    const { previewable, downloads } = splitArtifactsForDisplay([
      {
        filename: "report.pdf",
        mimeType: "application/pdf",
        contentBase64: "x",
      },
    ]);

    expect(previewable).toEqual([]);
    expect(downloads).toHaveLength(1);
  });

  it("previews images too", () => {
    const { previewable } = splitArtifactsForDisplay([
      {
        filename: "chart.png",
        mimeType: "image/png",
        url: `${URL_BASE}/c.png`,
      },
    ]);

    expect(previewable[0]?.type).toBe("image");
  });

  it("never previews a data file", () => {
    const { previewable, downloads } = splitArtifactsForDisplay([
      { filename: "data.csv", mimeType: "text/csv", url: `${URL_BASE}/d.csv` },
      {
        filename: "book.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        url: `${URL_BASE}/b.xlsx`,
      },
    ]);

    expect(previewable).toEqual([]);
    expect(downloads).toHaveLength(2);
  });

  it("falls back to the extension when the mime type is missing", () => {
    const { previewable } = splitArtifactsForDisplay([
      { filename: "REPORT.PDF", url: `${URL_BASE}/r.pdf` },
      { filename: "shot.JPEG", url: `${URL_BASE}/s.jpeg` },
    ]);

    expect(previewable.map((m) => m.type)).toEqual(["pdf", "image"]);
    expect(previewable[0]?.mimeType).toBe("application/pdf");
  });

  it("drops an artifact with neither a url nor bytes", () => {
    const { previewable, downloads } = splitArtifactsForDisplay([
      { filename: "ghost.pdf", mimeType: "application/pdf" },
    ]);

    expect(previewable).toEqual([]);
    expect(downloads).toEqual([]);
  });
});
