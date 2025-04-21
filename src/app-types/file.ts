/**
 * Represents a stored file in the system
 */
export type StoredFile = {
  id: string;
  filename: string;
  originalFilename: string;
  path: string;
  mimetype: string;
  size: number;
  userId: string;
  createdAt: Date;
  metadata?: Record<string, any>;
};

/**
 * Represents a file attachment in a chat message
 */
export type FileAttachment = {
  id: string;
  fileId: string;
  messageId: string;
  filename: string;
  mimetype: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: Date;
};

/**
 * Partial file type for creation
 */
export type FileUpload = Omit<StoredFile, 'id' | 'createdAt'>;

/**
 * File service interface
 */
export interface FileService {
  saveFile(file: FileUpload): Promise<StoredFile>;
  getFile(id: string): Promise<StoredFile | null>;
  getFilesByUserId(userId: string): Promise<StoredFile[]>;
  deleteFile(id: string): Promise<void>;
  createAttachment(attachment: Omit<FileAttachment, 'id' | 'createdAt'>): Promise<FileAttachment>;
  getAttachmentsByMessageId(messageId: string): Promise<FileAttachment[]>;
}
