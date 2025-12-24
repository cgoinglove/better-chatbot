import { Buffer } from "node:buffer";
import { ChatAttachment } from "app-types/chat";
import { isIngestSupported } from "@/lib/ai/file-support";
import { storageKeyFromUrl } from "@/lib/file-storage/storage-utils";
import { formatCsvPreviewText, parseCsvPreview } from "@/lib/file-ingest/csv";

type CsvPreviewPart = {
  type: "text";
  text: string;
  ingestionPreview: true;
};

export type DownloadFile = (key: string) => Promise<Buffer>;

const isCsvLikeAttachment = (attachment: ChatAttachment, key: string) => {
  const mediaType = attachment.mediaType || "";
  if (isIngestSupported(mediaType)) return true;
  const name = (attachment.filename || key || "").toLowerCase();
  if (/\.(csv)$/.test(name)) return true;
  if (
    /(^|[?&])contentType=text\/csv(&|$)/i.test(attachment.url || "") ||
    /(^|[?&])content-type=text\/csv(&|$)/i.test(attachment.url || "")
  ) {
    return true;
  }
  return false;
};

export const buildCsvIngestionPreviewParts = async (
  attachments: ChatAttachment[],
  download: DownloadFile,
): Promise<CsvPreviewPart[]> => {
  if (!attachments?.length) return [];
  const results = await Promise.all(
    attachments.map(async (attachment) => {
      if (attachment.type !== "source-url") return null;
      const key = storageKeyFromUrl(attachment.url);
      if (!key) return null;
      if (!isCsvLikeAttachment(attachment, key)) return null;

      try {
        const buffer = await download(key);
        const preview = parseCsvPreview(buffer, {
          maxRows: 50,
          maxCols: 12,
        });
        const text = formatCsvPreviewText(attachment.filename || key, preview);
        return {
          type: "text",
          text,
          ingestionPreview: true as const,
        };
      } catch (_error) {
        return null;
      }
    }),
  );

  return results.filter(Boolean) as CsvPreviewPart[];
};
