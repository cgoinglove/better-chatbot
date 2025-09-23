import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { FileNotFoundError } from "lib/errors";
import type { FileMetadata, FileStorage } from "./file-storage.interface";
import {
  resolveStoragePrefix,
  sanitizeFilename,
  toBuffer,
} from "./storage-utils";

const PUBLIC_ROOT = path.resolve(
  process.env.FILE_STORAGE_LOCAL_PUBLIC_ROOT ??
    path.join(process.cwd(), "public"),
);

const STORAGE_PREFIX = resolveStoragePrefix();

const METADATA_FILENAME = "metadata.json";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");

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

const metadataPathForKey = (key: string) =>
  normalizeKey(path.posix.join(path.posix.dirname(key), METADATA_FILENAME));

const buildPublicUrl = (key: string) => {
  const relativePath = `/${key}`;
  return baseUrl ? `${baseUrl}${relativePath}` : relativePath;
};

const makeFileMetadata = (
  key: string,
  filename: string,
  contentType: string,
  size: number,
): FileMetadata => ({
  key,
  filename,
  contentType,
  size,
  uploadedAt: new Date(),
});

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
      const id = randomUUID();
      const fileName = safeName || "file";
      const key = path.posix.join(prefix.replace(/\/$/, ""), id, fileName);
      const absolutePath = normalizeKey(key);

      await ensureDirectory(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, buffer);

      const metadata = makeFileMetadata(
        key,
        fileName,
        options.contentType ?? "application/octet-stream",
        buffer.byteLength,
      );

      const metadataPath = metadataPathForKey(key);
      await fs.writeFile(metadataPath, JSON.stringify(metadata));

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
      const metaPath = metadataPathForKey(normalizedKey);

      await fs.rm(absolutePath, { force: true });
      await fs.rm(metaPath, { force: true });

      const dir = path.dirname(absolutePath);
      try {
        await fs.rmdir(dir);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "ENOTEMPTY") {
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
      const metaPath = metadataPathForKey(normalizedKey);
      try {
        const raw = await fs.readFile(metaPath, "utf-8");
        const parsed = JSON.parse(raw) as FileMetadata;
        return {
          ...parsed,
          uploadedAt: parsed.uploadedAt
            ? new Date(parsed.uploadedAt)
            : undefined,
        };
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          try {
            const stats = await fs.stat(normalizeKey(normalizedKey));
            return {
              key: normalizedKey,
              filename: path.posix.basename(normalizedKey),
              contentType: "application/octet-stream",
              size: stats.size,
              uploadedAt: stats.mtime,
            } satisfies FileMetadata;
          } catch (statError: unknown) {
            if ((statError as NodeJS.ErrnoException).code === "ENOENT") {
              return null;
            }
            throw statError;
          }
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
