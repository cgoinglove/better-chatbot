import { Buffer } from "node:buffer";
import { ChatAttachment } from "app-types/chat";
import { storageKeyFromUrl } from "@/lib/file-storage/storage-utils";
import {
  parseExcelPreview,
  formatExcelPreviewText,
} from "@/lib/file-ingest/excel";

type ExcelPreviewPart = {
  type: "text";
  text: string;
  ingestionPreview: true;
};

export type DownloadFile = (key: string) => Promise<Buffer>;

const isExcelAttachment = (attachment: ChatAttachment, key: string) => {
  const mediaType = attachment.mediaType || "";
  if (
    mediaType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mediaType === "application/vnd.ms-excel"
  ) {
    return true;
  }
  const name = (attachment.filename || key || "").toLowerCase();
  return /\.(xlsx|xls)$/.test(name);
};

export const buildExcelIngestionPreviewParts = async (
  attachments: ChatAttachment[],
  download: DownloadFile,
): Promise<ExcelPreviewPart[]> => {
  if (!attachments?.length) return [];

  const results = await Promise.all(
    attachments.map(async (attachment) => {
      if (attachment.type !== "source-url") return null;
      const key = storageKeyFromUrl(attachment.url);
      if (!key) return null;
      if (!isExcelAttachment(attachment, key)) return null;

      try {
        const buffer = await download(key);
        const preview = parseExcelPreview(buffer);
        const text = formatExcelPreviewText(
          attachment.filename || key,
          preview,
        );
        return { type: "text" as const, text, ingestionPreview: true as const };
      } catch {
        return null;
      }
    }),
  );

  return results.filter(Boolean) as ExcelPreviewPart[];
};
