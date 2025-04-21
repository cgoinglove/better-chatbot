import * as fs from 'fs';

/**
 * Simple PDF parser interface
 */
export interface PDFParseResult {
  numpages: number;
  text: string;
  info: {
    Author?: string;
    Title?: string;
    CreationDate?: string;
    [key: string]: any;
  };
}

/**
 * Simple mock PDF parser that doesn't rely on external dependencies
 * This is used as a fallback when the real parser fails
 */
export function mockPdfParse(buffer: Buffer): Promise<PDFParseResult> {
  // Try to extract some basic text from the PDF buffer
  // This is a very simple approach and won't work well for most PDFs
  // but it's better than nothing when the real parser fails
  let text = '';
  
  try {
    // Convert buffer to string and look for text patterns
    const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
    
    // Extract text between common PDF text markers
    const textMatches = bufferStr.match(/BT\s*(.*?)\s*ET/gs);
    if (textMatches) {
      text = textMatches.join(' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\f/g, '\f')
        .replace(/\\b/g, '\b')
        .replace(/\\/g, '')
        .replace(/\(|\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // If we couldn't extract text, provide a placeholder
    if (!text || text.length < 10) {
      text = '[PDF content extracted - mock parser]';
    }
  } catch (error) {
    console.warn('Error in mock PDF parser:', error);
    text = '[PDF content extraction failed]';
  }
  
  // Create a mock result
  return Promise.resolve({
    numpages: 1, // We don't know the actual page count
    text,
    info: {
      Author: 'Unknown',
      Title: 'Unknown Document',
      CreationDate: new Date().toISOString(),
    },
  });
}

/**
 * Parse a PDF file from a file path
 */
export function parsePdfFile(filePath: string): Promise<PDFParseResult> {
  try {
    const buffer = fs.readFileSync(filePath);
    return mockPdfParse(buffer);
  } catch (error) {
    console.error(`Error reading PDF file ${filePath}:`, error);
    return Promise.resolve({
      numpages: 0,
      text: `[Error reading PDF file: ${error.message}]`,
      info: {
        Author: 'Unknown',
        Title: 'Error Document',
        CreationDate: new Date().toISOString(),
      },
    });
  }
}
