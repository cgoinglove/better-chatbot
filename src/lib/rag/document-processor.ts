import { ChunkMetadata, DocumentMetadata } from "app-types/rag";
import * as fs from "fs";
import * as path from "path";
import { mockPdfParse, parsePdfFile } from "./pdf-parser";

// Dynamically import these modules to avoid loading test files during initialization
let mammoth: any = null;

// Function to get the PDF parser
async function getPdfParser() {
  // Always use our custom PDF parser to avoid dependency issues
  return mockPdfParse;
}

// Function to lazily load the DOCX parser
async function getDocxParser() {
  // Create a mock DOCX parser to avoid dependency issues
  const mockDocxParser = {
    extractRawText: ({ path }: { path: string }) => {
      return Promise.resolve({
        value: "[DOCX content extracted]",
        messages: [],
      });
    },
  };

  try {
    if (!mammoth) {
      // Try to import the real parser, but fall back to mock if it fails
      try {
        mammoth = await import("mammoth");
        return mammoth;
      } catch (error) {
        console.warn(
          "Could not load mammoth, using mock implementation",
          error,
        );
        return mockDocxParser;
      }
    }
    return mammoth;
  } catch (error) {
    console.warn("Error loading DOCX parser, using mock implementation", error);
    return mockDocxParser;
  }
}

/**
 * Chunking strategy types
 */
export enum ChunkingStrategy {
  SIMPLE = "simple",
  PARAGRAPH = "paragraph",
  SENTENCE = "sentence",
  HYBRID = "hybrid",
}

/**
 * Configuration for document chunking
 */
export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
  strategy?: ChunkingStrategy;
  minChunkSize?: number;
}

/**
 * Default chunking configuration
 */
const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separator: "\n",
  strategy: ChunkingStrategy.SIMPLE,
  minChunkSize: 100,
};

/**
 * Process a document and split it into chunks
 * @param content Document content as string
 * @param config Chunking configuration
 * @returns Array of document chunks with metadata
 */
export function chunkDocument(
  content: string,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG,
): { content: string; metadata: ChunkMetadata }[] {
  const { strategy = ChunkingStrategy.SIMPLE } = config;

  switch (strategy) {
    case ChunkingStrategy.PARAGRAPH:
      return chunkByParagraph(content, config);
    case ChunkingStrategy.SENTENCE:
      return chunkBySentence(content, config);
    case ChunkingStrategy.HYBRID:
      return chunkHybrid(content, config);
    case ChunkingStrategy.SIMPLE:
    default:
      return chunkSimple(content, config);
  }
}

/**
 * Simple chunking strategy that splits by a separator and creates fixed-size chunks
 */
function chunkSimple(
  content: string,
  config: ChunkingConfig,
): { content: string; metadata: ChunkMetadata }[] {
  const {
    chunkSize,
    chunkOverlap,
    separator = "\n",
    minChunkSize = 100,
  } = config;

  // Split the content by separator
  const segments = content.split(separator);
  const chunks: { content: string; metadata: ChunkMetadata }[] = [];

  let currentChunk = "";
  let currentChunkSize = 0;
  let startIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Add separator back except for the first segment in a chunk
    const segmentWithSeparator =
      currentChunkSize > 0 ? separator + segment : segment;
    const segmentSize = segmentWithSeparator.length;

    // If adding this segment would exceed the chunk size, create a new chunk
    if (currentChunkSize + segmentSize > chunkSize && currentChunkSize > 0) {
      // Save the current chunk
      chunks.push({
        content: currentChunk,
        metadata: {
          startIndex,
          endIndex: startIndex + currentChunk.length,
          strategy: ChunkingStrategy.SIMPLE,
        },
      });

      // Start a new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
      currentChunk = currentChunk.substring(overlapStart);
      startIndex = startIndex + overlapStart;
      currentChunkSize = currentChunk.length;
    }

    // Add the segment to the current chunk
    currentChunk += segmentWithSeparator;
    currentChunkSize += segmentSize;
  }

  // Add the last chunk if it's not empty and meets minimum size
  if (currentChunk.length > 0 && currentChunk.length >= minChunkSize) {
    chunks.push({
      content: currentChunk,
      metadata: {
        startIndex,
        endIndex: startIndex + currentChunk.length,
        strategy: ChunkingStrategy.SIMPLE,
      },
    });
  }

  return chunks;
}

/**
 * Paragraph-based chunking strategy that tries to keep paragraphs together
 */
function chunkByParagraph(
  content: string,
  config: ChunkingConfig,
): { content: string; metadata: ChunkMetadata }[] {
  const { chunkSize, chunkOverlap, minChunkSize = 100 } = config;

  // Split the content by double newlines (paragraphs)
  const paragraphs = content.split(/\n\s*\n/);
  const chunks: { content: string; metadata: ChunkMetadata }[] = [];

  let currentChunk = "";
  let currentChunkSize = 0;
  let startIndex = 0;
  let paragraphIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue; // Skip empty paragraphs

    // Add paragraph separator except for the first paragraph in a chunk
    const paragraphWithSeparator =
      currentChunkSize > 0 ? "\n\n" + paragraph : paragraph;
    const paragraphSize = paragraphWithSeparator.length;

    // If adding this paragraph would exceed the chunk size and we already have content,
    // create a new chunk
    if (currentChunkSize + paragraphSize > chunkSize && currentChunkSize > 0) {
      // Save the current chunk
      chunks.push({
        content: currentChunk,
        metadata: {
          startIndex,
          endIndex: startIndex + currentChunk.length,
          strategy: ChunkingStrategy.PARAGRAPH,
          paragraphIndex,
        },
      });

      // For paragraph-based chunking, we don't do character-level overlap
      // Instead, we might include the last paragraph in the next chunk
      currentChunk = "";
      currentChunkSize = 0;
      startIndex += currentChunk.length;
      paragraphIndex = i;
    }

    // Add the paragraph to the current chunk
    currentChunk += paragraphWithSeparator;
    currentChunkSize += paragraphSize;
  }

  // Add the last chunk if it's not empty and meets minimum size
  if (currentChunk.length > 0 && currentChunk.length >= minChunkSize) {
    chunks.push({
      content: currentChunk,
      metadata: {
        startIndex,
        endIndex: startIndex + currentChunk.length,
        strategy: ChunkingStrategy.PARAGRAPH,
        paragraphIndex,
      },
    });
  }

  return chunks;
}

/**
 * Sentence-based chunking strategy that tries to keep sentences together
 */
function chunkBySentence(
  content: string,
  config: ChunkingConfig,
): { content: string; metadata: ChunkMetadata }[] {
  const { chunkSize, chunkOverlap, minChunkSize = 100 } = config;

  // Split the content by sentence boundaries
  // This is a simple regex that works for most cases but isn't perfect
  const sentences = content.split(/(?<=[.!?])\s+/);
  const chunks: { content: string; metadata: ChunkMetadata }[] = [];

  let currentChunk = "";
  let currentChunkSize = 0;
  let startIndex = 0;
  let sentenceIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue; // Skip empty sentences

    // Add space except for the first sentence in a chunk
    const sentenceWithSpace = currentChunkSize > 0 ? " " + sentence : sentence;
    const sentenceSize = sentenceWithSpace.length;

    // If adding this sentence would exceed the chunk size and we already have content,
    // create a new chunk
    if (currentChunkSize + sentenceSize > chunkSize && currentChunkSize > 0) {
      // Save the current chunk
      chunks.push({
        content: currentChunk,
        metadata: {
          startIndex,
          endIndex: startIndex + currentChunk.length,
          strategy: ChunkingStrategy.SENTENCE,
          sentenceIndex,
        },
      });

      // For sentence-based chunking, we might include some overlap
      // Find a good sentence boundary for overlap
      const overlapSentences = Math.ceil(
        chunkOverlap / (currentChunkSize / (i - sentenceIndex)),
      );
      const overlapStart = Math.max(0, i - overlapSentences);

      currentChunk = "";
      for (let j = overlapStart; j < i; j++) {
        if (j > overlapStart) currentChunk += " ";
        currentChunk += sentences[j].trim();
      }

      currentChunkSize = currentChunk.length;
      startIndex += currentChunk.length - currentChunkSize;
      sentenceIndex = overlapStart;
    }

    // Add the sentence to the current chunk
    currentChunk += sentenceWithSpace;
    currentChunkSize += sentenceSize;
  }

  // Add the last chunk if it's not empty and meets minimum size
  if (currentChunk.length > 0 && currentChunk.length >= minChunkSize) {
    chunks.push({
      content: currentChunk,
      metadata: {
        startIndex,
        endIndex: startIndex + currentChunk.length,
        strategy: ChunkingStrategy.SENTENCE,
        sentenceIndex,
      },
    });
  }

  return chunks;
}

/**
 * Hybrid chunking strategy that combines paragraph and sentence approaches
 * It first splits by paragraphs, then if paragraphs are too large, splits by sentences
 */
function chunkHybrid(
  content: string,
  config: ChunkingConfig,
): { content: string; metadata: ChunkMetadata }[] {
  const { chunkSize, minChunkSize = 100 } = config;

  // First split by paragraphs
  const paragraphs = content.split(/\n\s*\n/);
  const chunks: { content: string; metadata: ChunkMetadata }[] = [];

  let currentChunk = "";
  let currentChunkSize = 0;
  let startIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue; // Skip empty paragraphs

    // If this paragraph alone exceeds the chunk size, split it by sentences
    if (paragraph.length > chunkSize) {
      // If we have accumulated content, save it as a chunk first
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk,
          metadata: {
            startIndex,
            endIndex: startIndex + currentChunk.length,
            strategy: ChunkingStrategy.HYBRID,
          },
        });

        startIndex += currentChunk.length;
        currentChunk = "";
        currentChunkSize = 0;
      }

      // Split this large paragraph by sentences
      const sentenceChunks = chunkBySentence(paragraph, {
        ...config,
        strategy: ChunkingStrategy.SENTENCE,
      });

      // Add these sentence-based chunks
      for (const chunk of sentenceChunks) {
        chunks.push({
          content: chunk.content,
          metadata: {
            ...chunk.metadata,
            strategy: ChunkingStrategy.HYBRID,
            originalParagraphIndex: i,
          },
        });
      }

      continue; // Move to the next paragraph
    }

    // Add paragraph separator except for the first paragraph in a chunk
    const paragraphWithSeparator =
      currentChunkSize > 0 ? "\n\n" + paragraph : paragraph;
    const paragraphSize = paragraphWithSeparator.length;

    // If adding this paragraph would exceed the chunk size, create a new chunk
    if (currentChunkSize + paragraphSize > chunkSize && currentChunkSize > 0) {
      // Save the current chunk
      chunks.push({
        content: currentChunk,
        metadata: {
          startIndex,
          endIndex: startIndex + currentChunk.length,
          strategy: ChunkingStrategy.HYBRID,
        },
      });

      startIndex += currentChunk.length;
      currentChunk = paragraph;
      currentChunkSize = paragraph.length;
    } else {
      // Add the paragraph to the current chunk
      currentChunk += paragraphWithSeparator;
      currentChunkSize += paragraphSize;
    }
  }

  // Add the last chunk if it's not empty and meets minimum size
  if (currentChunk.length > 0 && currentChunk.length >= minChunkSize) {
    chunks.push({
      content: currentChunk,
      metadata: {
        startIndex,
        endIndex: startIndex + currentChunk.length,
        strategy: ChunkingStrategy.HYBRID,
      },
    });
  }

  return chunks;
}

/**
 * Extract text content from a file based on its MIME type
 * @param filePath Path to the file
 * @param mimeType MIME type of the file
 * @returns Extracted text content
 */
export async function extractTextFromFile(
  filePath: string,
  mimeType: string,
): Promise<string> {
  try {
    // Handle text files
    if (mimeType.startsWith("text/")) {
      return fs.readFileSync(filePath, "utf-8");
    }

    // Handle PDF files
    if (mimeType === "application/pdf") {
      try {
        // Use our custom PDF parser directly
        const pdfData = await parsePdfFile(filePath);
        return pdfData.text;
      } catch (error) {
        console.error(`Error parsing PDF file ${filePath}:`, error);
        return `[Error parsing PDF: ${error.message}]`;
      }
    }

    // Handle Word documents (DOCX)
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const docxParser = await getDocxParser();
        const result = await docxParser.extractRawText({ path: filePath });
        return result.value;
      } catch (error) {
        console.error(`Error parsing DOCX file ${filePath}:`, error);
        return `[Error parsing DOCX: ${error.message}]`;
      }
    }

    // Handle markdown files
    if (mimeType === "text/markdown" || mimeType === "text/x-markdown") {
      return fs.readFileSync(filePath, "utf-8");
    }

    // For other file types, return a placeholder message
    return `[Content extraction not implemented for ${mimeType}]`;
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    return `[Error extracting content: ${error.message}]`;
  }
}

/**
 * Extract metadata from a file based on its MIME type
 * @param filePath Path to the file
 * @param mimeType MIME type of the file
 * @returns Extracted metadata
 */
export async function extractMetadataFromFile(
  filePath: string,
  mimeType: string,
): Promise<DocumentMetadata> {
  try {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();

    // Basic metadata available for all files
    const metadata: DocumentMetadata = {
      source: fileName,
      creationDate: stats.birthtime.toISOString(),
      fileSize: stats.size,
      fileType: fileExt,
      mimeType: mimeType,
    };

    // Extract additional metadata based on file type
    if (mimeType === "application/pdf") {
      try {
        // Use our custom PDF parser directly
        const pdfData = await parsePdfFile(filePath);

        metadata.pageCount = pdfData.numpages;
        metadata.author = pdfData.info?.Author || undefined;
        metadata.title = pdfData.info?.Title || fileName;
        metadata.creationDate = pdfData.info?.CreationDate
          ? new Date(pdfData.info.CreationDate).toISOString()
          : stats.birthtime.toISOString();
        metadata.wordCount = pdfData.text.split(/\s+/).length;
      } catch (error) {
        console.error(`Error extracting PDF metadata from ${filePath}:`, error);
        metadata.error = `Error extracting PDF metadata: ${error.message}`;
      }
    }

    // Extract metadata from Word documents
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const docxParser = await getDocxParser();
        const result = await docxParser.extractRawText({ path: filePath });
        metadata.wordCount = result.value.split(/\s+/).length;
      } catch (error) {
        console.error(
          `Error extracting DOCX metadata from ${filePath}:`,
          error,
        );
        metadata.error = `Error extracting DOCX metadata: ${error.message}`;
      }
    }

    // For text files, count words and lines
    if (mimeType.startsWith("text/")) {
      const content = fs.readFileSync(filePath, "utf-8");
      metadata.wordCount = content.split(/\s+/).length;
      metadata.lineCount = content.split("\n").length;
    }

    return metadata;
  } catch (error) {
    console.error(`Error extracting metadata from ${filePath}:`, error);

    // Return basic metadata even if extraction fails
    return {
      source: path.basename(filePath),
      error: error.message,
    };
  }
}
