import "server-only";
import { IS_CLOUDFLARE_WORKER, IS_DEV } from "lib/const";
import type { FileStorage } from "./file-storage.interface";
import { createS3FileStorage } from "./s3-file-storage";
import logger from "logger";

export type FileStorageDriver = "vercel-blob" | "s3";

const resolveDriver = (): FileStorageDriver => {
  const candidate = process.env.FILE_STORAGE_TYPE;

  const normalized = candidate?.trim().toLowerCase();
  if (IS_CLOUDFLARE_WORKER) return "s3";
  if (normalized === "vercel-blob" || normalized === "s3") return normalized;
  if (!normalized) return "s3";

  throw new Error(`Unsupported FILE_STORAGE_TYPE: ${candidate}`);
};

declare global {
  // eslint-disable-next-line no-var
  var __server__file_storage__: Promise<FileStorage> | undefined;
}

const storageDriver = resolveDriver();

const createFileStorage = async (): Promise<FileStorage> => {
  logger.info(`Creating file storage: ${storageDriver}`);
  switch (storageDriver) {
    case "vercel-blob": {
      if (IS_CLOUDFLARE_WORKER) {
        throw new Error("Vercel Blob is not supported on Cloudflare Workers");
      }
      const { createVercelBlobStorage } = await import("./vercel-blob-storage");
      return createVercelBlobStorage();
    }
    case "s3":
      return createS3FileStorage();
    default: {
      const exhaustiveCheck: never = storageDriver;
      throw new Error(`Unsupported file storage driver: ${exhaustiveCheck}`);
    }
  }
};

const getServerFileStorage = () => {
  const storage = globalThis.__server__file_storage__ || createFileStorage();

  if (IS_DEV) {
    globalThis.__server__file_storage__ = storage;
  }

  return storage;
};

const serverFileStorage = new Proxy({} as FileStorage, {
  get(_target, prop) {
    return async (...args: unknown[]) => {
      const storage = await getServerFileStorage();
      const value = Reflect.get(storage, prop);
      if (typeof value !== "function") return value;
      return value.apply(storage, args);
    };
  },
});

export { serverFileStorage, storageDriver };
