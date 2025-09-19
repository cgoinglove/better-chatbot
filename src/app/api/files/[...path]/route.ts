import { NextRequest, NextResponse } from "next/server";
import { serverFileStorage } from "lib/file-storage";
import { FileNotFoundError } from "lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const filePath = path.join("/");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 },
      );
    }

    // Check if file exists
    const exists = await serverFileStorage.exists(filePath);
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Get file metadata
    const metadata = await serverFileStorage.getMetadata(filePath);

    // Download file
    const fileBuffer = await serverFileStorage.download(filePath);

    // Return file with appropriate headers
    return new NextResponse(Buffer.from(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Length": metadata.size.toString(),
        "Content-Disposition": `inline; filename="${metadata.filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
      },
    });
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    console.error("File serving error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
