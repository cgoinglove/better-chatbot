export interface FileMetadata {
  filename: string;
  contentType: string;
  size: number;
  lastModified?: Date;
}

export interface UploadResult {
  url: string; // Public access URL
  key: string; // Storage internal key/path
  metadata: FileMetadata;
}

export interface UploadOptions {
  filename?: string;
  contentType?: string;
}

export interface StorageConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
}

export interface FileStorage {
  // Upload file to storage
  upload(
    file: Buffer | Blob | File,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  // Download file from storage
  download(key: string): Promise<Buffer>;

  // Delete file from storage
  delete(key: string): Promise<void>;

  // Check if file exists
  exists(key: string): Promise<boolean>;

  // Get file metadata
  getMetadata(key: string): Promise<FileMetadata>;

  // Get public URL
  getPublicUrl(key: string): string;
}
