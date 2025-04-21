import { NextRequest, NextResponse } from "next/server";
import { fileService } from "lib/db/file-service";
import fs from "fs/promises";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const file = await fileService.getFile(id);
    
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    
    // Verify the file belongs to the current user
    const userId = getMockUserSession().id;
    if (file.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
    
    // Check if file has a thumbnail
    const thumbnailPath = file.metadata?.thumbnailPath;
    
    if (!thumbnailPath) {
      return NextResponse.json(
        { error: "Thumbnail not available" },
        { status: 404 }
      );
    }
    
    // Read the thumbnail from disk
    const fileBuffer = await fs.readFile(thumbnailPath);
    
    // Return the thumbnail with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": file.mimetype,
        "Content-Disposition": `inline; filename="thumbnail-${file.originalFilename}"`,
      },
    });
  } catch (error: any) {
    logger.error("Error retrieving thumbnail:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve thumbnail" },
      { status: 500 }
    );
  }
}
