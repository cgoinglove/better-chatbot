import { Document, RAGConfig, SearchResult } from "app-types/rag";
import { libraryService } from "lib/db/library-service";
import { vectorService } from "lib/db/vector-service";
import {
  ChunkingStrategy,
  extractMetadataFromFile,
  extractTextFromFile,
} from "./document-processor";
import {
  EmbeddingModelType,
  createEmbeddingModel,
  generateEmbeddings,
} from "./embedding-service";

// Default RAG configuration
const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: "local", // Use local embedding model by default
  similarityThreshold: 0.7,
  maxResults: 5,
  chunkingStrategy: ChunkingStrategy.HYBRID,
  minChunkSize: 100,
};

/**
 * RAG Service for document ingestion and querying
 */
export class RAGService {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }

  /**
   * Ingest a document into the RAG system
   * @param libraryId ID of the library to store the document in
   * @param userId ID of the user
   * @param title Document title
   * @param filePath Path to the document file
   * @param mimeType MIME type of the document
   * @param description Optional document description
   * @returns The created document
   */
  async ingestDocument(
    libraryId: string,
    userId: string,
    title: string,
    filePath: string,
    mimeType: string,
    description?: string,
  ): Promise<Document> {
    // Check if the library exists
    const library = await libraryService.selectLibrary(libraryId);
    if (!library) {
      throw new Error(`Library with ID ${libraryId} not found`);
    }

    // Extract text from the file
    const content = await extractTextFromFile(filePath, mimeType);

    // Extract metadata from the file
    const metadata = await extractMetadataFromFile(filePath, mimeType);

    // Create the document
    const document = await vectorService.insertDocument({
      libraryId,
      userId,
      title,
      description: description || null,
      filePath,
      mimeType,
      size: content.length,
      metadata,
    });

    // Generate embeddings for the document
    let embeddingModelType: EmbeddingModelType;

    // Determine which embedding model to use
    switch (this.config.embeddingModel) {
      case "openai-large":
        embeddingModelType = EmbeddingModelType.OPENAI_LARGE;
        break;
      case "openai-small":
        embeddingModelType = EmbeddingModelType.OPENAI_SMALL;
        break;
      case "google":
        embeddingModelType = EmbeddingModelType.GOOGLE;
        break;
      case "local":
      default:
        embeddingModelType = EmbeddingModelType.LOCAL;
        break;
    }

    // Create the embedding model with fallback handling
    const embeddingModel = createEmbeddingModel(embeddingModelType);
    const chunkingStrategy =
      (this.config.chunkingStrategy as ChunkingStrategy) ||
      ChunkingStrategy.HYBRID;

    const embeddings = await generateEmbeddings(
      document.id,
      libraryId,
      userId,
      content,
      embeddingModel,
      chunkingStrategy,
    );

    // Store the embeddings
    await vectorService.insertEmbeddings(embeddings);

    return document;
  }

  /**
   * Ingest text content directly into the RAG system
   * @param libraryId ID of the library to store the document in
   * @param userId ID of the user
   * @param title Document title
   * @param content Text content to ingest
   * @param description Optional document description
   * @param metadata Optional document metadata
   * @returns The created document
   */
  async ingestText(
    libraryId: string,
    userId: string,
    title: string,
    content: string,
    description?: string,
    metadata?: any,
  ): Promise<Document> {
    // Check if the library exists
    const library = await libraryService.selectLibrary(libraryId);
    if (!library) {
      throw new Error(`Library with ID ${libraryId} not found`);
    }

    // Create the document
    const document = await vectorService.insertDocument({
      libraryId,
      userId,
      title,
      description: description || null,
      filePath: null,
      mimeType: "text/plain",
      size: content.length,
      metadata: metadata || null,
    });

    // Generate embeddings for the document
    let embeddingModelType: EmbeddingModelType;

    // Determine which embedding model to use
    switch (this.config.embeddingModel) {
      case "openai-large":
        embeddingModelType = EmbeddingModelType.OPENAI_LARGE;
        break;
      case "openai-small":
        embeddingModelType = EmbeddingModelType.OPENAI_SMALL;
        break;
      case "google":
        embeddingModelType = EmbeddingModelType.GOOGLE;
        break;
      case "local":
      default:
        embeddingModelType = EmbeddingModelType.LOCAL;
        break;
    }

    // Create the embedding model with fallback handling
    const embeddingModel = createEmbeddingModel(embeddingModelType);
    const chunkingStrategy =
      (this.config.chunkingStrategy as ChunkingStrategy) ||
      ChunkingStrategy.HYBRID;

    const embeddings = await generateEmbeddings(
      document.id,
      libraryId,
      userId,
      content,
      embeddingModel,
      chunkingStrategy,
    );

    // Store the embeddings
    await vectorService.insertEmbeddings(embeddings);

    return document;
  }

  /**
   * Query the RAG system
   * @param query Query text
   * @param libraryIds Optional array of library IDs to search in
   * @param maxResults Maximum number of results to return
   * @param similarityThreshold Minimum similarity score for results
   * @param filters Optional filters to apply to the search
   * @param hybridSearch Whether to use hybrid search (semantic + keyword)
   * @param keywordWeight Weight for keyword search in hybrid mode (0-1)
   * @returns Array of search results
   */
  async query(
    query: string,
    libraryIds?: string[],
    maxResults?: number,
    similarityThreshold?: number,
    filters?: {
      mimeType?: string | string[];
      fileType?: string | string[];
      author?: string;
      minWordCount?: number;
      maxWordCount?: number;
      [key: string]: any;
    },
    hybridSearch: boolean = false,
    keywordWeight: number = 0.3,
  ): Promise<SearchResult[]> {
    return vectorService.semanticSearch({
      query,
      libraryIds,
      maxResults: maxResults || this.config.maxResults,
      similarityThreshold:
        similarityThreshold || this.config.similarityThreshold,
      filters,
      hybridSearch,
      keywordWeight,
    });
  }

  /**
   * Delete a document and its embeddings
   * @param documentId ID of the document to delete
   */
  async deleteDocument(documentId: string): Promise<void> {
    await vectorService.deleteDocument(documentId);
  }

  /**
   * Get a document by ID
   * @param documentId ID of the document
   * @returns The document or null if not found
   */
  async getDocument(documentId: string): Promise<Document | null> {
    return vectorService.selectDocument(documentId);
  }

  /**
   * Get all documents in a library
   * @param libraryId ID of the library
   * @returns Array of documents
   */
  async getDocumentsByLibrary(libraryId: string): Promise<Document[]> {
    return vectorService.selectDocumentsByLibraryId(libraryId);
  }
}
