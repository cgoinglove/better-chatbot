/**
 * Simple custom error classes
 */

export class AppError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

// 401 Unauthorized Error
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

// 403 Forbidden Error
export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

/**
 * File storage error types
 */
export class FileStorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "FileStorageError";
  }
}

export class FileNotFoundError extends FileStorageError {
  constructor(fileId: string, cause?: unknown) {
    super(`File not found: ${fileId}`, "FILE_NOT_FOUND", cause);
    this.name = "FileNotFoundError";
  }
}

export class FileTooLargeError extends FileStorageError {
  constructor(size: number, maxSize: number, cause?: unknown) {
    super(
      `File too large: ${size} bytes (max: ${maxSize} bytes)`,
      "FILE_TOO_LARGE",
      cause,
    );
    this.name = "FileTooLargeError";
  }
}

export class StorageQuotaExceededError extends FileStorageError {
  constructor(cause?: unknown) {
    super("Storage quota exceeded", "QUOTA_EXCEEDED", cause);
    this.name = "StorageQuotaExceededError";
  }
}

export class UnsupportedFileTypeError extends FileStorageError {
  constructor(mimeType: string, cause?: unknown) {
    super(`Unsupported file type: ${mimeType}`, "UNSUPPORTED_TYPE", cause);
    this.name = "UnsupportedFileTypeError";
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}
