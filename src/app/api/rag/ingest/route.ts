import { NextRequest } from "next/server";
import { RAGService } from "lib/rag/rag-service";
import { getMockUserSession } from "lib/mock";
import { saveFileToUploads } from "lib/db/file-service";
import logger from "logger";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get form data
    const libraryId = formData.get("libraryId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || undefined;
    const file = formData.get("file") as File;
    
    // Validate required fields
    if (!libraryId) {
      return new Response("Library ID is required", { status: 400 });
    }
    
    if (!title) {
      return new Response("Document title is required", { status: 400 });
    }
    
    // Get user ID from session
    const userId = getMockUserSession().id;
    
    // Initialize RAG service
    const ragService = new RAGService();
    
    // Handle file upload
    if (file) {
      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Save file to uploads directory
      const { path } = await saveFileToUploads(buffer, file.name);
      
      // Ingest document
      const document = await ragService.ingestDocument(
        libraryId,
        userId,
        title || file.name,
        path,
        file.type,
        description
      );
      
      return Response.json(document);
    } else {
      // Handle text content
      const content = formData.get("content") as string;
      
      if (!content) {
        return new Response("Either file or content is required", { status: 400 });
      }
      
      // Ingest text
      const document = await ragService.ingestText(
        libraryId,
        userId,
        title,
        content,
        description
      );
      
      return Response.json(document);
    }
  } catch (error: any) {
    logger.error("Error ingesting document:", error);
    return new Response(error.message || "Failed to ingest document", { status: 500 });
  }
}
