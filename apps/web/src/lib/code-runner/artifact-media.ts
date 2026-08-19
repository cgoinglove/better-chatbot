import type { E2BArtifact } from "./code-runner.interface";
import type { MediaResource } from "@/types/media";

/**
 * Splits generated files into ones worth rendering and ones worth linking.
 *
 * A produced file used to surface only as a small download chip inside the
 * execution log, which is collapsed by default — so a user could ask for a PDF,
 * get one, and never see it. PDFs and images render inline instead.
 *
 * Only artifacts that made it to storage can be previewed: the viewers take a
 * URL, and the base64 fallback (used when the upload failed) has nothing to
 * point an iframe at, so it stays a download.
 */
export function splitArtifactsForDisplay(artifacts: E2BArtifact[]): {
  previewable: MediaResource[];
  downloads: E2BArtifact[];
} {
  const previewable: MediaResource[] = [];
  const downloads: E2BArtifact[] = [];

  for (const artifact of artifacts) {
    const type = previewTypeFor(artifact);

    if (type && artifact.url) {
      previewable.push({
        type,
        url: artifact.url,
        mimeType: artifact.mimeType ?? mimeFallbackFor(type),
        title: artifact.filename,
      });
      // Still offered as a download — the viewers carry their own download
      // control, so listing it twice in the chip row would be noise.
      continue;
    }

    if (artifact.url || artifact.contentBase64) downloads.push(artifact);
  }

  return { previewable, downloads };
}

/**
 * The mime type is derived from the filename extension at collection time, so
 * fall back to the extension when it is missing or generic.
 */
function previewTypeFor(artifact: E2BArtifact): "pdf" | "image" | undefined {
  const mime = artifact.mimeType?.toLowerCase() ?? "";
  const name = artifact.filename?.toLowerCase() ?? "";

  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(name)) return "image";
  return undefined;
}

function mimeFallbackFor(type: "pdf" | "image"): string {
  return type === "pdf" ? "application/pdf" : "image/png";
}
