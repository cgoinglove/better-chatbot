import { NextResponse } from "next/server";
import { serverFileStorage } from "lib/file-storage";
import { parseCsvPreview, formatCsvPreviewText } from "lib/file-ingest/csv";
import {
  parseExcelPreview,
  formatExcelPreviewText,
} from "lib/file-ingest/excel";
import { storageKeyFromUrl } from "lib/file-storage/storage-utils";

type Body = {
  key?: string;
  url?: string;
  type?: "csv" | "excel" | "auto";
  maxRows?: number;
  maxCols?: number;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = body.key || (body.url ? storageKeyFromUrl(body.url) : undefined);
  if (!key) {
    return NextResponse.json(
      { error: "Missing 'key' or 'url'" },
      { status: 400 },
    );
  }

  const type = body.type || "auto";
  const isExcel =
    type === "excel" ||
    /\.(xlsx|xls)$/i.test(key) ||
    /(^|[?&])contentType=application\/vnd/i.test(body.url || "");
  const isCsv =
    !isExcel &&
    (type === "csv" ||
      /\.(csv)$/i.test(key) ||
      /(^|[?&])contentType=text\/csv(&|$)/i.test(body.url || "") ||
      /(^|[?&])content-type=text\/csv(&|$)/i.test(body.url || ""));

  if (!isExcel && !isCsv) {
    return NextResponse.json(
      {
        error: "Unsupported file type for ingest",
        solution: "Supported: CSV, XLSX, XLS",
      },
      { status: 400 },
    );
  }

  const buf = await serverFileStorage.download(key);

  if (isExcel) {
    const preview = parseExcelPreview(buf);
    const text = formatExcelPreviewText(body.key || key, preview);
    return NextResponse.json({ ok: true, type: "excel", key, preview, text });
  }

  const preview = parseCsvPreview(buf, {
    maxRows: Math.min(200, Math.max(1, body.maxRows ?? 50)),
    maxCols: Math.min(40, Math.max(1, body.maxCols ?? 12)),
  });
  const text = formatCsvPreviewText(key, preview);
  return NextResponse.json({ ok: true, type: "csv", key, preview, text });
}
