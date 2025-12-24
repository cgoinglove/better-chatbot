import { NextResponse } from "next/server";
import { serverFileStorage } from "lib/file-storage";
import { parseCsvPreview, formatCsvPreviewText } from "lib/file-ingest/csv";
import { storageKeyFromUrl } from "lib/file-storage/storage-utils";

type Body = {
  key?: string; // storage key (preferred)
  url?: string; // will be converted to key if possible
  type?: "csv" | "auto";
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

  // Infer type from extension when auto
  const type = body.type || "auto";
  const isCsv =
    type === "csv" ||
    /\.(csv)$/i.test(key) ||
    /(^|[?&])contentType=text\/csv(&|$)/i.test(body.url || "");

  if (!isCsv) {
    return NextResponse.json(
      {
        error: "Unsupported file type for ingest",
        solution:
          "Currently supported: CSV. Convert your spreadsheet to CSV or paste sample rows.",
      },
      { status: 400 },
    );
  }

  const buf = await serverFileStorage.download(key);
  const preview = parseCsvPreview(buf, {
    maxRows: Math.min(200, Math.max(1, body.maxRows ?? 50)),
    maxCols: Math.min(40, Math.max(1, body.maxCols ?? 12)),
  });

  const text = formatCsvPreviewText(key, preview);

  return NextResponse.json({ ok: true, type: "csv", key, preview, text });
}
