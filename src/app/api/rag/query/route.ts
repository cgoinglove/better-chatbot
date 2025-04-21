import { RAGService } from "lib/rag/rag-service";
import logger from "logger";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const libraryIds = searchParams.getAll("libraryId");
    const maxResults = searchParams.get("maxResults")
      ? parseInt(searchParams.get("maxResults")!)
      : undefined;
    const similarityThreshold = searchParams.get("similarityThreshold")
      ? parseFloat(searchParams.get("similarityThreshold")!)
      : undefined;
    const hybridSearch = searchParams.get("hybridSearch") === "true";
    const keywordWeight = searchParams.get("keywordWeight")
      ? parseFloat(searchParams.get("keywordWeight")!)
      : undefined;

    // Parse filters
    const filters: any = {};
    const mimeTypes = searchParams.getAll("mimeType");
    if (mimeTypes.length > 0) {
      filters.mimeType = mimeTypes.length === 1 ? mimeTypes[0] : mimeTypes;
    }

    const fileTypes = searchParams.getAll("fileType");
    if (fileTypes.length > 0) {
      filters.fileType = fileTypes.length === 1 ? fileTypes[0] : fileTypes;
    }

    const author = searchParams.get("author");
    if (author) {
      filters.author = author;
    }

    const minWordCount = searchParams.get("minWordCount");
    if (minWordCount) {
      filters.minWordCount = parseInt(minWordCount);
    }

    const maxWordCount = searchParams.get("maxWordCount");
    if (maxWordCount) {
      filters.maxWordCount = parseInt(maxWordCount);
    }

    if (!query) {
      return new Response("Query parameter 'q' is required", { status: 400 });
    }

    // Initialize RAG service
    const ragService = new RAGService();

    // Query the RAG system
    const results = await ragService.query(
      query,
      libraryIds.length > 0 ? libraryIds : undefined,
      maxResults,
      similarityThreshold,
      Object.keys(filters).length > 0 ? filters : undefined,
      hybridSearch,
      keywordWeight,
    );

    return Response.json(results);
  } catch (error: any) {
    logger.error("Error querying RAG system:", error);
    return new Response(error.message || "Failed to query RAG system", {
      status: 500,
    });
  }
}
