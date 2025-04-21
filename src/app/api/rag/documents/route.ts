import { NextRequest } from "next/server";
import { RAGService } from "lib/rag/rag-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const libraryId = searchParams.get("libraryId");
    
    if (!libraryId) {
      return new Response("Library ID is required", { status: 400 });
    }
    
    // Initialize RAG service
    const ragService = new RAGService();
    
    // Get documents by library
    const documents = await ragService.getDocumentsByLibrary(libraryId);
    
    return Response.json(documents);
  } catch (error: any) {
    logger.error("Error fetching documents:", error);
    return new Response(error.message || "Failed to fetch documents", { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");
    
    if (!documentId) {
      return new Response("Document ID is required", { status: 400 });
    }
    
    // Initialize RAG service
    const ragService = new RAGService();
    
    // Delete document
    await ragService.deleteDocument(documentId);
    
    return new Response(null, { status: 204 });
  } catch (error: any) {
    logger.error("Error deleting document:", error);
    return new Response(error.message || "Failed to delete document", { status: 500 });
  }
}
