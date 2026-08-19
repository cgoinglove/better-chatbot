import { Buffer } from "node:buffer";
import { ChatAttachment } from "app-types/chat";
import { storageKeyFromUrl } from "@/lib/file-storage/storage-utils";
import { formatPdfPreviewText, parsePdfPreview } from "@/lib/file-ingest/pdf";
import globalLogger from "logger";

type PdfPreviewPart = {
  type: "text";
  text: string;
  ingestionPreview: true;
};

export type DownloadFile = (key: string) => Promise<Buffer>;

/**
 * Check if an attachment is a PDF file.
 * Mirrors CSV detection logic for consistency.
 */
const isPdfAttachment = (attachment: ChatAttachment, key: string): boolean => {
  const mediaType = attachment.mediaType || "";
  if (mediaType === "application/pdf") return true;

  const name = (attachment.filename || key || "").toLowerCase();
  if (/\.(pdf)$/.test(name)) return true;

  // Check URL query params for content-type
  if (
    /(^|[?&])contentType=application\/pdf(&|$)/i.test(attachment.url || "") ||
    /(^|[?&])content-type=application\/pdf(&|$)/i.test(attachment.url || "")
  ) {
    return true;
  }

  return false;
};

/**
 * Build PDF ingestion preview parts for LLM consumption.
 * Mirrors CSV ingestion pattern: downloads PDFs, extracts text,
 * returns as text parts with ingestionPreview flag (hidden from UI).
 *
 * This approach bypasses binary file handling through AI Gateway
 * by sending plain text instead, eliminating format compatibility issues.
 *
 * @param attachments - Array of chat attachments
 * @param download - Function to download file by storage key
 * @returns Array of text parts with extracted PDF content
 */
export const buildPdfIngestionPreviewParts = async (
  attachments: ChatAttachment[],
  download: DownloadFile,
): Promise<PdfPreviewPart[]> => {
  if (!attachments?.length) return [];

  const results = await Promise.all(
    attachments.map(async (attachment) => {
      // Process both "file" and "source-url" types for PDFs
      // (PDFs are uploaded as "file" type when supported)
      if (attachment.type !== "file" && attachment.type !== "source-url")
        return null;

      const key = storageKeyFromUrl(attachment.url);
      if (!key) return null;
      if (!isPdfAttachment(attachment, key)) return null;

      try {
        // Download PDF from storage
        globalLogger.info(`Downloading PDF: ${attachment.filename || key}`);
        const buffer = await download(key);
        globalLogger.info(`Downloaded PDF, size: ${buffer.length} bytes`);

        // Parse PDF and extract text with token limit
        globalLogger.info(`Parsing PDF: ${attachment.filename || key}`);
        const preview = await parsePdfPreview(buffer, {
          maxChars: 50000, // ~12K tokens (safe for most LLMs)
        });
        globalLogger.info(
          `PDF parsed: ${preview.pages} pages, ${preview.totalChars} chars, truncated: ${preview.truncated}`,
        );

        // Format as LLM-friendly text
        const text = formatPdfPreviewText(attachment.filename || key, preview);

        return {
          type: "text",
          text,
          ingestionPreview: true as const,
        };
      } catch (error) {
        // Fail gracefully: log error but don't break chat flow
        globalLogger.error(
          `Failed to parse PDF ${attachment.filename || key}:`,
          error instanceof Error ? error.message : error,
        );
        globalLogger.error(
          "PDF parsing error stack:",
          error instanceof Error ? error.stack : "No stack trace",
        );
        return null;
      }
    }),
  );

  return results.filter(Boolean) as PdfPreviewPart[];
};
