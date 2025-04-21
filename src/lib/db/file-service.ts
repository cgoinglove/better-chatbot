import {
  FileAttachment,
  FileService,
  FileUpload,
  StoredFile,
} from "app-types/file";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import { generateUUID } from "lib/utils";
import path from "path";
import { pgDb } from "./db.pg";
import { sqliteDb } from "./db.sqlite";
import "./file-service-init"; // Import the initialization module
import {
  FileAttachmentPgSchema,
  FileAttachmentSqliteSchema,
  FilePgSchema,
  FileSqliteSchema,
} from "./schema.file";

// Helper function to convert timestamps to Date objects
const convertToDate = (timestamp: number | Date): Date => {
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
};

// Helper function to convert Date objects to timestamps
const convertToTimestamp = (date: Date): number => {
  return date.getTime();
};

// SQLite implementation
const sqliteFileService: FileService = {
  async saveFile(file: FileUpload): Promise<StoredFile> {
    const id = generateUUID();
    const result = await sqliteDb
      .insert(FileSqliteSchema)
      .values({
        ...file,
        id,
        metadata: file.metadata ? JSON.stringify(file.metadata) : null,
      })
      .returning();

    return {
      ...result[0],
      createdAt: convertToDate(result[0].createdAt as number),
      metadata: result[0].metadata
        ? JSON.parse(result[0].metadata as string)
        : undefined,
    };
  },

  async getFile(id: string): Promise<StoredFile | null> {
    const result = await sqliteDb
      .select()
      .from(FileSqliteSchema)
      .where(eq(FileSqliteSchema.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0],
      createdAt: convertToDate(result[0].createdAt as number),
      metadata: result[0].metadata
        ? JSON.parse(result[0].metadata as string)
        : undefined,
    };
  },

  async getFilesByUserId(userId: string): Promise<StoredFile[]> {
    const result = await sqliteDb
      .select()
      .from(FileSqliteSchema)
      .where(eq(FileSqliteSchema.userId, userId));

    return result.map((file) => ({
      ...file,
      createdAt: convertToDate(file.createdAt as number),
      metadata: file.metadata ? JSON.parse(file.metadata as string) : undefined,
    }));
  },

  async deleteFile(id: string): Promise<void> {
    const file = await this.getFile(id);
    if (file) {
      // Delete the file from the filesystem
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error(`Error deleting file ${file.path}:`, error);
      }

      // Delete from database
      await sqliteDb
        .delete(FileSqliteSchema)
        .where(eq(FileSqliteSchema.id, id));
    }
  },

  async createAttachment(
    attachment: Omit<FileAttachment, "id" | "createdAt">,
  ): Promise<FileAttachment> {
    const id = generateUUID();
    const result = await sqliteDb
      .insert(FileAttachmentSqliteSchema)
      .values({
        ...attachment,
        id,
      })
      .returning();

    return {
      ...result[0],
      createdAt: convertToDate(result[0].createdAt as number),
    };
  },

  async getAttachmentsByMessageId(
    messageId: string,
  ): Promise<FileAttachment[]> {
    const result = await sqliteDb
      .select()
      .from(FileAttachmentSqliteSchema)
      .where(eq(FileAttachmentSqliteSchema.messageId, messageId));

    return result.map((attachment) => ({
      ...attachment,
      createdAt: convertToDate(attachment.createdAt as number),
    }));
  },
};

// PostgreSQL implementation
const pgFileService: FileService = {
  async saveFile(file: FileUpload): Promise<StoredFile> {
    const result = await pgDb
      .insert(FilePgSchema)
      .values({
        ...file,
        metadata: file.metadata ? JSON.stringify(file.metadata) : null,
      })
      .returning();

    return {
      ...result[0],
      createdAt: result[0].createdAt as Date,
      metadata: result[0].metadata
        ? JSON.parse(result[0].metadata as string)
        : undefined,
    };
  },

  async getFile(id: string): Promise<StoredFile | null> {
    const result = await pgDb
      .select()
      .from(FilePgSchema)
      .where(eq(FilePgSchema.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0],
      createdAt: result[0].createdAt as Date,
      metadata: result[0].metadata
        ? JSON.parse(result[0].metadata as string)
        : undefined,
    };
  },

  async getFilesByUserId(userId: string): Promise<StoredFile[]> {
    const result = await pgDb
      .select()
      .from(FilePgSchema)
      .where(eq(FilePgSchema.userId, userId));

    return result.map((file) => ({
      ...file,
      createdAt: file.createdAt as Date,
      metadata: file.metadata ? JSON.parse(file.metadata as string) : undefined,
    }));
  },

  async deleteFile(id: string): Promise<void> {
    const file = await this.getFile(id);
    if (file) {
      // Delete the file from the filesystem
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error(`Error deleting file ${file.path}:`, error);
      }

      // Delete from database
      await pgDb.delete(FilePgSchema).where(eq(FilePgSchema.id, id));
    }
  },

  async createAttachment(
    attachment: Omit<FileAttachment, "id" | "createdAt">,
  ): Promise<FileAttachment> {
    const result = await pgDb
      .insert(FileAttachmentPgSchema)
      .values(attachment)
      .returning();

    return {
      ...result[0],
      createdAt: result[0].createdAt as Date,
    };
  },

  async getAttachmentsByMessageId(
    messageId: string,
  ): Promise<FileAttachment[]> {
    const result = await pgDb
      .select()
      .from(FileAttachmentPgSchema)
      .where(eq(FileAttachmentPgSchema.messageId, messageId));

    return result.map((attachment) => ({
      ...attachment,
      createdAt: attachment.createdAt as Date,
    }));
  },
};

// Export the appropriate service based on the environment
export const fileService =
  process.env.USE_FILE_SYSTEM_DB === "true" ? sqliteFileService : pgFileService;

// File storage utility functions
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
export const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating uploads directory:", error);
  }
};

// Generate a unique filename
export const generateUniqueFilename = (originalFilename: string): string => {
  const ext = path.extname(originalFilename);
  const basename = path.basename(originalFilename, ext);
  const timestamp = Date.now();
  const uniqueId = generateUUID().slice(0, 8);
  return `${basename}-${timestamp}-${uniqueId}${ext}`;
};

// Save a file to the uploads directory
export const saveFileToUploads = async (
  buffer: Buffer,
  originalFilename: string,
): Promise<{ filename: string; path: string }> => {
  await ensureUploadsDir();
  const filename = generateUniqueFilename(originalFilename);
  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return { filename, path: filePath };
};

// Generate a thumbnail for an image
export const generateThumbnail = async (
  filePath: string,
  mimetype: string,
): Promise<string | undefined> => {
  // This is a placeholder for actual thumbnail generation
  // In a real implementation, you would use a library like sharp to resize images
  if (!mimetype.startsWith("image/")) {
    return undefined;
  }

  // For now, we'll just return the original path
  // In a real implementation, you would create a thumbnail and return its path
  return filePath;
};
