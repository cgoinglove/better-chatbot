import { NextRequest, NextResponse } from "next/server";
import { fileService, generateThumbnail, saveFileToUploads } from "lib/db/file-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = getMockUserSession().id;
    
    // Check if the request is multipart/form-data
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Save file to uploads directory
    const { filename, path } = await saveFileToUploads(buffer, file.name);
    
    // Generate thumbnail for images
    const thumbnailPath = await generateThumbnail(path, file.type);
    
    // Save file metadata to database
    const storedFile = await fileService.saveFile({
      filename,
      originalFilename: file.name,
      path,
      mimetype: file.type,
      size: file.size,
      userId,
      metadata: {
        thumbnailPath,
      },
    });

    return NextResponse.json({
      id: storedFile.id,
      filename: storedFile.filename,
      originalFilename: storedFile.originalFilename,
      mimetype: storedFile.mimetype,
      size: storedFile.size,
      url: `/api/files/${storedFile.id}`,
      thumbnailUrl: thumbnailPath ? `/api/files/${storedFile.id}/thumbnail` : undefined,
    });
  } catch (error: any) {
    logger.error("Error uploading file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
