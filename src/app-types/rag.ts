/**
 * Represents a document in the RAG system
 */
export type Document = {
  id: string;
  libraryId: string;
  userId: string;
  title: string;
  description: string | null;
  filePath: string | null;
  mimeType: string | null;
  size: number | null;
  metadata: DocumentMetadata | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Metadata for a document
 */
export type DocumentMetadata = {
  source?: string;
  author?: string;
  creationDate?: string;
  pageCount?: number;
  wordCount?: number;
  lineCount?: number;
  fileSize?: number;
  fileType?: string;
  mimeType?: string;
  title?: string;
  error?: string;
  [key: string]: any;
};

/**
 * Represents a chunk of a document with its embedding
 */
export type DocumentEmbedding = {
  id: string;
  documentId: string;
  libraryId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: ChunkMetadata | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Metadata for a document chunk
 */
export type ChunkMetadata = {
  startIndex?: number;
  endIndex?: number;
  pageNumber?: number;
  strategy?: string;
  paragraphIndex?: number;
  sentenceIndex?: number;
  originalParagraphIndex?: number;
  [key: string]: any;
};

/**
 * Result of a semantic search
 */
export type SearchResult = {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  content: string;
  score: number;
  metadata: ChunkMetadata | null;
  documentMetadata?: DocumentMetadata | null;
};

/**
 * Configuration for the RAG system
 */
export type RAGConfig = {
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: "openai-small" | "openai-large" | "google" | "local";
  similarityThreshold: number;
  maxResults: number;
  chunkingStrategy?: string;
  minChunkSize?: number;
};

/**
 * Parameters for a RAG query
 */
export type RAGQueryParams = {
  query: string;
  libraryIds?: string[];
  maxResults?: number;
  similarityThreshold?: number;
  filters?: {
    mimeType?: string | string[];
    fileType?: string | string[];
    author?: string;
    minWordCount?: number;
    maxWordCount?: number;
    [key: string]: any;
  };
  hybridSearch?: boolean; // Whether to use hybrid search (semantic + keyword)
  keywordWeight?: number; // Weight for keyword search in hybrid mode (0-1)
};
