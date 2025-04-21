import {
  Document,
  DocumentEmbedding,
  RAGQueryParams,
  SearchResult,
} from "app-types/rag";
import { and, eq, ilike, inArray, like, or } from "drizzle-orm";
import {
  EmbeddingModelType,
  calculateBM25Score,
  calculateHybridScore,
  cosineSimilarity,
  createEmbeddingModel,
} from "lib/rag/embedding-service";
import { generateUUID } from "lib/utils";
import { pgDb } from "./db.pg";
import { sqliteDb } from "./db.sqlite";
import {
  DocumentEmbeddingPgSchema,
  DocumentEmbeddingSqliteSchema,
  DocumentPgSchema,
  DocumentSqliteSchema,
} from "./schema.vector";

// Helper functions for SQLite
const convertToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date): number => {
  return date.getTime();
};

// SQLite implementation
const sqliteVectorService = {
  // Document operations
  async insertDocument(
    document: Omit<Document, "id" | "createdAt" | "updatedAt">,
  ): Promise<Document> {
    const id = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await sqliteDb.insert(DocumentSqliteSchema).values({
      id,
      libraryId: document.libraryId,
      userId: document.userId,
      title: document.title,
      description: document.description,
      filePath: document.filePath,
      mimeType: document.mimeType,
      size: document.size,
      metadata: document.metadata ? JSON.stringify(document.metadata) : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id,
      ...document,
      createdAt: now,
      updatedAt: now,
    };
  },

  async selectDocument(id: string): Promise<Document | null> {
    const result = await sqliteDb
      .select()
      .from(DocumentSqliteSchema)
      .where(eq(DocumentSqliteSchema.id, id));

    if (result.length === 0) {
      return null;
    }

    const doc = result[0];
    return {
      ...doc,
      metadata: doc.metadata ? JSON.parse(doc.metadata) : null,
      createdAt: convertToDate(doc.createdAt as number),
      updatedAt: convertToDate(doc.updatedAt as number),
    };
  },

  async selectDocumentsByLibraryId(libraryId: string): Promise<Document[]> {
    const result = await sqliteDb
      .select()
      .from(DocumentSqliteSchema)
      .where(eq(DocumentSqliteSchema.libraryId, libraryId));

    return result.map((doc) => ({
      ...doc,
      metadata: doc.metadata ? JSON.parse(doc.metadata) : null,
      createdAt: convertToDate(doc.createdAt as number),
      updatedAt: convertToDate(doc.updatedAt as number),
    }));
  },

  async deleteDocument(id: string): Promise<void> {
    // First delete all embeddings for this document
    await sqliteDb
      .delete(DocumentEmbeddingSqliteSchema)
      .where(eq(DocumentEmbeddingSqliteSchema.documentId, id));

    // Then delete the document
    await sqliteDb
      .delete(DocumentSqliteSchema)
      .where(eq(DocumentSqliteSchema.id, id));
  },

  // Embedding operations
  async insertEmbedding(
    embedding: Omit<DocumentEmbedding, "id" | "createdAt" | "updatedAt">,
  ): Promise<DocumentEmbedding> {
    const id = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await sqliteDb.insert(DocumentEmbeddingSqliteSchema).values({
      id,
      documentId: embedding.documentId,
      libraryId: embedding.libraryId,
      userId: embedding.userId,
      chunkIndex: embedding.chunkIndex,
      content: embedding.content,
      embedding: JSON.stringify(embedding.embedding),
      metadata: embedding.metadata ? JSON.stringify(embedding.metadata) : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id,
      ...embedding,
      createdAt: now,
      updatedAt: now,
    };
  },

  async insertEmbeddings(
    embeddings: Omit<DocumentEmbedding, "id" | "createdAt" | "updatedAt">[],
  ): Promise<DocumentEmbedding[]> {
    const result: DocumentEmbedding[] = [];

    for (const embedding of embeddings) {
      const inserted = await this.insertEmbedding(embedding);
      result.push(inserted);
    }

    return result;
  },

  async selectEmbeddingsByDocumentId(
    documentId: string,
  ): Promise<DocumentEmbedding[]> {
    const result = await sqliteDb
      .select()
      .from(DocumentEmbeddingSqliteSchema)
      .where(eq(DocumentEmbeddingSqliteSchema.documentId, documentId));

    return result.map((emb) => ({
      ...emb,
      embedding: JSON.parse(emb.embedding),
      metadata: emb.metadata ? JSON.parse(emb.metadata) : null,
      createdAt: convertToDate(emb.createdAt as number),
      updatedAt: convertToDate(emb.updatedAt as number),
    }));
  },

  async deleteEmbeddingsByDocumentId(documentId: string): Promise<void> {
    await sqliteDb
      .delete(DocumentEmbeddingSqliteSchema)
      .where(eq(DocumentEmbeddingSqliteSchema.documentId, documentId));
  },

  // Semantic search
  async semanticSearch(params: RAGQueryParams): Promise<SearchResult[]> {
    const {
      query,
      libraryIds,
      maxResults = 5,
      similarityThreshold = 0.7,
      filters,
      hybridSearch = false,
      keywordWeight = 0.3,
    } = params;

    // Generate embedding for the query
    const embeddingModel = createEmbeddingModel(
      EmbeddingModelType.OPENAI_SMALL,
    );
    const queryEmbedding = await embeddingModel.generateEmbedding(query);

    // Build the query for embeddings
    let embeddingsQuery = sqliteDb.select().from(DocumentEmbeddingSqliteSchema);

    // Apply library filters if specified
    if (libraryIds && libraryIds.length > 0) {
      embeddingsQuery = embeddingsQuery.where(
        inArray(DocumentEmbeddingSqliteSchema.libraryId, libraryIds),
      );
    }

    // Get all embeddings based on the query
    const embeddingResults = await embeddingsQuery;

    // Parse embeddings
    const embeddings: DocumentEmbedding[] = embeddingResults.map((emb) => ({
      ...emb,
      embedding: JSON.parse(emb.embedding),
      metadata: emb.metadata ? JSON.parse(emb.metadata) : null,
      createdAt: convertToDate(emb.createdAt as number),
      updatedAt: convertToDate(emb.updatedAt as number),
    }));

    // Get all documents for filtering and metadata
    const documentQuery = sqliteDb.select().from(DocumentSqliteSchema);

    // Apply library filters to documents query if specified
    if (libraryIds && libraryIds.length > 0) {
      documentQuery.where(inArray(DocumentSqliteSchema.libraryId, libraryIds));
    }

    // Apply additional filters if specified
    if (filters) {
      const conditions = [];

      // Filter by MIME type
      if (filters.mimeType) {
        if (Array.isArray(filters.mimeType)) {
          conditions.push(
            inArray(DocumentSqliteSchema.mimeType, filters.mimeType),
          );
        } else {
          conditions.push(eq(DocumentSqliteSchema.mimeType, filters.mimeType));
        }
      }

      // Filter by file type
      if (filters.fileType) {
        if (Array.isArray(filters.fileType)) {
          // For SQLite, we need to check if the metadata contains the file type
          // This is a simplified approach since SQLite doesn't have JSON operators
          const fileTypeConditions = filters.fileType.map((type) =>
            like(DocumentSqliteSchema.metadata, `%"fileType":"${type}"%`),
          );
          conditions.push(or(...fileTypeConditions));
        } else {
          conditions.push(
            like(
              DocumentSqliteSchema.metadata,
              `%"fileType":"${filters.fileType}"%`,
            ),
          );
        }
      }

      // Filter by author
      if (filters.author) {
        conditions.push(
          like(DocumentSqliteSchema.metadata, `%"author":"${filters.author}"%`),
        );
      }

      // Apply word count filters
      if (filters.minWordCount) {
        conditions.push(
          like(
            DocumentSqliteSchema.metadata,
            `%"wordCount":${filters.minWordCount}%`,
          ),
        );
      }

      if (filters.maxWordCount) {
        conditions.push(
          like(
            DocumentSqliteSchema.metadata,
            `%"wordCount":${filters.maxWordCount}%`,
          ),
        );
      }

      // Apply all conditions to the query
      if (conditions.length > 0) {
        documentQuery.where(and(...conditions));
      }
    }

    const documents = await documentQuery;

    // Create a map of document IDs to documents
    const documentMap = new Map<string, Document>();
    documents.forEach((doc) => {
      documentMap.set(doc.id, {
        ...doc,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : null,
        createdAt: convertToDate(doc.createdAt as number),
        updatedAt: convertToDate(doc.updatedAt as number),
      });
    });

    // Filter embeddings to only include those from documents that passed the filters
    const filteredEmbeddings = embeddings.filter((emb) =>
      documentMap.has(emb.documentId),
    );

    // Calculate average document length for BM25 (if using hybrid search)
    let avgDocLength = 0;
    if (hybridSearch) {
      const totalWords = filteredEmbeddings.reduce((sum, emb) => {
        const wordCount = emb.content.split(/\s+/).length;
        return sum + wordCount;
      }, 0);
      avgDocLength = totalWords / filteredEmbeddings.length || 1;
    }

    // Calculate scores
    const scoredResults = filteredEmbeddings.map((emb) => {
      // Calculate semantic similarity score
      const semanticScore = cosineSimilarity(queryEmbedding, emb.embedding);

      // Calculate keyword search score if hybrid search is enabled
      let finalScore = semanticScore;
      if (hybridSearch) {
        const keywordScore = calculateBM25Score(
          query,
          emb.content,
          avgDocLength,
        );
        finalScore = calculateHybridScore(
          semanticScore,
          keywordScore,
          1 - keywordWeight,
        );
      }

      const doc = documentMap.get(emb.documentId);

      return {
        documentId: emb.documentId,
        documentTitle: doc ? doc.title : "Unknown Document",
        chunkId: emb.id,
        content: emb.content,
        score: finalScore,
        metadata: emb.metadata,
        documentMetadata: doc ? doc.metadata : null,
      };
    });

    // Filter by similarity threshold and sort by score
    const filteredResults = scoredResults
      .filter((result) => result.score >= similarityThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return filteredResults;
  },
};

// PostgreSQL implementation
const pgVectorService = {
  // Document operations
  async insertDocument(
    document: Omit<Document, "id" | "createdAt" | "updatedAt">,
  ): Promise<Document> {
    const now = new Date();

    const result = await pgDb
      .insert(DocumentPgSchema)
      .values({
        libraryId: document.libraryId,
        userId: document.userId,
        title: document.title,
        description: document.description,
        filePath: document.filePath,
        mimeType: document.mimeType,
        size: document.size,
        metadata: document.metadata,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result[0];
  },

  async selectDocument(id: string): Promise<Document | null> {
    const result = await pgDb
      .select()
      .from(DocumentPgSchema)
      .where(eq(DocumentPgSchema.id, id));

    return result[0] || null;
  },

  async selectDocumentsByLibraryId(libraryId: string): Promise<Document[]> {
    const result = await pgDb
      .select()
      .from(DocumentPgSchema)
      .where(eq(DocumentPgSchema.libraryId, libraryId));

    return result;
  },

  async deleteDocument(id: string): Promise<void> {
    // First delete all embeddings for this document
    await pgDb
      .delete(DocumentEmbeddingPgSchema)
      .where(eq(DocumentEmbeddingPgSchema.documentId, id));

    // Then delete the document
    await pgDb.delete(DocumentPgSchema).where(eq(DocumentPgSchema.id, id));
  },

  // Embedding operations
  async insertEmbedding(
    embedding: Omit<DocumentEmbedding, "id" | "createdAt" | "updatedAt">,
  ): Promise<DocumentEmbedding> {
    const now = new Date();

    const result = await pgDb
      .insert(DocumentEmbeddingPgSchema)
      .values({
        documentId: embedding.documentId,
        libraryId: embedding.libraryId,
        userId: embedding.userId,
        chunkIndex: embedding.chunkIndex,
        content: embedding.content,
        embedding: embedding.embedding,
        metadata: embedding.metadata,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result[0];
  },

  async insertEmbeddings(
    embeddings: Omit<DocumentEmbedding, "id" | "createdAt" | "updatedAt">[],
  ): Promise<DocumentEmbedding[]> {
    if (embeddings.length === 0) {
      return [];
    }

    const now = new Date();
    const values = embeddings.map((emb) => ({
      documentId: emb.documentId,
      libraryId: emb.libraryId,
      userId: emb.userId,
      chunkIndex: emb.chunkIndex,
      content: emb.content,
      embedding: emb.embedding,
      metadata: emb.metadata,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await pgDb
      .insert(DocumentEmbeddingPgSchema)
      .values(values)
      .returning();

    return result;
  },

  async selectEmbeddingsByDocumentId(
    documentId: string,
  ): Promise<DocumentEmbedding[]> {
    const result = await pgDb
      .select()
      .from(DocumentEmbeddingPgSchema)
      .where(eq(DocumentEmbeddingPgSchema.documentId, documentId));

    return result;
  },

  async deleteEmbeddingsByDocumentId(documentId: string): Promise<void> {
    await pgDb
      .delete(DocumentEmbeddingPgSchema)
      .where(eq(DocumentEmbeddingPgSchema.documentId, documentId));
  },

  // Semantic search
  async semanticSearch(params: RAGQueryParams): Promise<SearchResult[]> {
    const {
      query,
      libraryIds,
      maxResults = 5,
      similarityThreshold = 0.7,
      filters,
      hybridSearch = false,
      keywordWeight = 0.3,
    } = params;

    // Generate embedding for the query
    const embeddingModel = createEmbeddingModel(
      EmbeddingModelType.OPENAI_SMALL,
    );
    const queryEmbedding = await embeddingModel.generateEmbedding(query);

    // Build the query for embeddings
    let embeddingsQuery = pgDb.select().from(DocumentEmbeddingPgSchema);

    // Apply library filters if specified
    if (libraryIds && libraryIds.length > 0) {
      embeddingsQuery = embeddingsQuery.where(
        inArray(DocumentEmbeddingPgSchema.libraryId, libraryIds),
      );
    }

    // Get all embeddings based on the query
    const embeddings = await embeddingsQuery;

    // Get all documents for filtering and metadata
    let documentQuery = pgDb.select().from(DocumentPgSchema);

    // Apply library filters to documents query if specified
    if (libraryIds && libraryIds.length > 0) {
      documentQuery = documentQuery.where(
        inArray(DocumentPgSchema.libraryId, libraryIds),
      );
    }

    // Apply additional filters if specified
    if (filters) {
      const conditions = [];

      // Filter by MIME type
      if (filters.mimeType) {
        if (Array.isArray(filters.mimeType)) {
          conditions.push(inArray(DocumentPgSchema.mimeType, filters.mimeType));
        } else {
          conditions.push(eq(DocumentPgSchema.mimeType, filters.mimeType));
        }
      }

      // Filter by file type
      if (filters.fileType) {
        if (Array.isArray(filters.fileType)) {
          // For PostgreSQL, we can use JSON operators
          const fileTypeConditions = filters.fileType.map((type) =>
            // This is a simplified approach - in a real implementation, you would use proper JSON operators
            ilike(
              DocumentPgSchema.metadata.cast("text"),
              `%"fileType":"${type}"%`,
            ),
          );
          conditions.push(or(...fileTypeConditions));
        } else {
          conditions.push(
            ilike(
              DocumentPgSchema.metadata.cast("text"),
              `%"fileType":"${filters.fileType}"%`,
            ),
          );
        }
      }

      // Filter by author
      if (filters.author) {
        conditions.push(
          ilike(
            DocumentPgSchema.metadata.cast("text"),
            `%"author":"${filters.author}"%`,
          ),
        );
      }

      // Apply word count filters - in PostgreSQL we would use JSON operators
      if (filters.minWordCount || filters.maxWordCount) {
        // This is a simplified approach - in a real implementation, you would use proper JSON operators
        // For now, we'll just filter after fetching the documents
      }

      // Apply all conditions to the query
      if (conditions.length > 0) {
        documentQuery = documentQuery.where(and(...conditions));
      }
    }

    const documents = await documentQuery;

    // Create a map of document IDs to documents
    const documentMap = new Map<string, Document>();
    documents.forEach((doc) => {
      // Apply word count filters manually if needed
      if (filters && (filters.minWordCount || filters.maxWordCount)) {
        const wordCount = doc.metadata?.wordCount;
        if (wordCount) {
          if (filters.minWordCount && wordCount < filters.minWordCount) return;
          if (filters.maxWordCount && wordCount > filters.maxWordCount) return;
        }
      }

      documentMap.set(doc.id, doc);
    });

    // Filter embeddings to only include those from documents that passed the filters
    const filteredEmbeddings = embeddings.filter((emb) =>
      documentMap.has(emb.documentId),
    );

    // Calculate average document length for BM25 (if using hybrid search)
    let avgDocLength = 0;
    if (hybridSearch) {
      const totalWords = filteredEmbeddings.reduce((sum, emb) => {
        const wordCount = emb.content.split(/\s+/).length;
        return sum + wordCount;
      }, 0);
      avgDocLength = totalWords / filteredEmbeddings.length || 1;
    }

    // Calculate scores
    const scoredResults = filteredEmbeddings.map((emb) => {
      // Calculate semantic similarity score
      const semanticScore = cosineSimilarity(queryEmbedding, emb.embedding);

      // Calculate keyword search score if hybrid search is enabled
      let finalScore = semanticScore;
      if (hybridSearch) {
        const keywordScore = calculateBM25Score(
          query,
          emb.content,
          avgDocLength,
        );
        finalScore = calculateHybridScore(
          semanticScore,
          keywordScore,
          1 - keywordWeight,
        );
      }

      const doc = documentMap.get(emb.documentId);

      return {
        documentId: emb.documentId,
        documentTitle: doc ? doc.title : "Unknown Document",
        chunkId: emb.id,
        content: emb.content,
        score: finalScore,
        metadata: emb.metadata,
        documentMetadata: doc ? doc.metadata : null,
      };
    });

    // Filter by similarity threshold and sort by score
    const filteredResults = scoredResults
      .filter((result) => result.score >= similarityThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return filteredResults;
  },
};

// Export the appropriate service based on environment
export const vectorService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteVectorService
  : pgVectorService;
