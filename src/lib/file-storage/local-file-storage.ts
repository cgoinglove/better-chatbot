import { promises as fs } from "node:fs";
import path from "node:path";
import { FileNotFoundError } from "lib/errors";
import { BASE_URL } from "lib/const";
import type { FileMetadata, FileStorage } from "./file-storage.interface";
import {
  resolveStoragePrefix,
  sanitizeFilename,
  toBuffer,
  getContentTypeFromFilename,
} from "./storage-utils";
import { generateUUID } from "lib/utils";

const PUBLIC_ROOT = path.resolve(
  process.env.FILE_STORAGE_LOCAL_PUBLIC_ROOT ??
    path.join(process.cwd(), "public"),
);

const STORAGE_PREFIX = resolveStoragePrefix();

const ensureDirectory = async (directory: string) => {
  await fs.mkdir(directory, { recursive: true });
};

const toRelativeKey = (key: string) => {
  const trimmed = key.replace(/^\/+/, "");
  const normalized = path.posix.normalize(trimmed);
  if (normalized.startsWith("../") || normalized === "..") {
    throw new Error("Invalid storage key");
  }
  return normalized;
};

const normalizeKey = (key: string) => {
  const relative = toRelativeKey(key);
  const absolute = path.resolve(PUBLIC_ROOT, ...relative.split("/"));
  if (
    absolute !== PUBLIC_ROOT &&
    !absolute.startsWith(`${PUBLIC_ROOT}${path.sep}`)
  ) {
    throw new Error("Invalid storage key");
  }
  return absolute;
};

const buildPublicUrl = (key: string) => {
  const relativePath = `/${key}`;
  return `${BASE_URL}${relativePath}`;
};

/**
 * Build file metadata from filesystem info.
 * No separate metadata.json file needed - we use fs.stat() and filename.
 */
const buildFileMetadata = async (
  key: string,
  absolutePath: string,
  providedContentType?: string,
): Promise<FileMetadata> => {
  const stats = await fs.stat(absolutePath);
  const filename = path.posix.basename(key);

  return {
    key,
    filename,
    contentType: providedContentType || getContentTypeFromFilename(filename),
    size: stats.size,
    uploadedAt: stats.mtime,
  };
};

export const createLocalFileStorage = (): FileStorage => {
  const prefix = STORAGE_PREFIX ? `${STORAGE_PREFIX}/` : "";

  const ensurePrefixDirectory = async () => {
    const directory = normalizeKey(prefix);
    await ensureDirectory(directory);
  };

  const resolveKey = (key: string) => toRelativeKey(key);

  const storage: FileStorage = {
    async upload(content, options = {}) {
      await ensurePrefixDirectory();
      const buffer = await toBuffer(content);

      const safeName = sanitizeFilename(options.filename ?? "file");
      const id = generateUUID();
      const fileName = safeName || "file";
      const key = path.posix.join(prefix.replace(/\/$/, ""), id, fileName);
      const absolutePath = normalizeKey(key);

      await ensureDirectory(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, buffer);

      // Build metadata from filesystem (no separate metadata.json)
      const metadata = await buildFileMetadata(
        key,
        absolutePath,
        options.contentType,
      );

      return {
        key,
        sourceUrl: buildPublicUrl(key),
        metadata,
      };
    },

    async download(key) {
      const normalizedKey = resolveKey(key);
      const absolutePath = normalizeKey(normalizedKey);
      try {
        return await fs.readFile(absolutePath);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          throw new FileNotFoundError(normalizedKey, error);
        }
        throw error;
      }
    },

    async delete(key) {
      const normalizedKey = resolveKey(key);
      const absolutePath = normalizeKey(normalizedKey);

      await fs.rm(absolutePath, { force: true });

      // Try to remove the directory if it's empty
      const dir = path.dirname(absolutePath);
      try {
        await fs.rmdir(dir);
      } catch (error: unknown) {
        // Ignore ENOTEMPTY and ENOENT errors
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOTEMPTY" && code !== "ENOENT") {
          throw error;
        }
      }
    },

    async exists(key) {
      const normalizedKey = resolveKey(key);
      try {
        await fs.access(normalizeKey(normalizedKey));
        return true;
      } catch {
        return false;
      }
    },

    async getMetadata(key) {
      const normalizedKey = resolveKey(key);
      const absolutePath = normalizeKey(normalizedKey);

      try {
        return await buildFileMetadata(normalizedKey, absolutePath);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },

    async getSourceUrl(key) {
      const normalizedKey = resolveKey(key);
      const exists = await storage.exists(normalizedKey);
      return exists ? buildPublicUrl(normalizedKey) : null;
    },

    async getDownloadUrl(key) {
      return storage.getSourceUrl(key);
    },
  };

  return storage;
};
