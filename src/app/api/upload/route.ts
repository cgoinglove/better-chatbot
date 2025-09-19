import { NextRequest, NextResponse } from "next/server";
import { serverFileStorage } from "lib/file-storage";
import { FileStorageError } from "lib/errors";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
        { status: 413 },
      );
    }

    // Upload file
    const result = await serverFileStorage.upload(file, {
      filename: file.name,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);

    if (error instanceof FileStorageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "File key is required" },
        { status: 400 },
      );
    }

    await serverFileStorage.delete(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("File deletion error:", error);

    if (error instanceof FileStorageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
