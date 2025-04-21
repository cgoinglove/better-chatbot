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
    
    // Read the file from disk
    const fileBuffer = await fs.readFile(file.path);
    
    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": file.mimetype,
        "Content-Disposition": `inline; filename="${file.originalFilename}"`,
      },
    });
  } catch (error: any) {
    logger.error("Error retrieving file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    // Delete the file
    await fileService.deleteFile(id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error deleting file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete file" },
      { status: 500 }
    );
  }
}
