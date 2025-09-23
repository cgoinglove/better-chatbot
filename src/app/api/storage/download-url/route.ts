import { NextResponse } from "next/server";
import { z } from "zod";
import { serverFileStorage } from "lib/file-storage";

const downloadRequestSchema = z.object({
  key: z.string().min(1, "key is required"),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = downloadRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { key } = parseResult.data;

  try {
    const [sourceUrl, downloadUrl, metadata] = await Promise.all([
      serverFileStorage.getSourceUrl(key),
      serverFileStorage.getDownloadUrl?.(key) ??
        Promise.resolve<string | null>(null),
      serverFileStorage.getMetadata(key),
    ]);

    if (!sourceUrl) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({
      key,
      sourceUrl,
      downloadUrl: downloadUrl ?? sourceUrl,
      metadata,
    });
  } catch (error) {
    console.error("Failed to resolve download URL", error);
    return NextResponse.json(
      { error: "Failed to resolve download URL" },
      { status: 500 },
    );
  }
}
