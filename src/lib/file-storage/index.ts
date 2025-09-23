import "server-only";
import { IS_DEV, IS_VERCEL_ENV } from "lib/const";
import type { FileStorage } from "./file-storage.interface";
import { createLocalFileStorage } from "./local-file-storage";
import { createVercelBlobStorage } from "./vercel-blob-storage";

export type FileStorageDriver = "local" | "vercel-blob" | "s3";

const resolveDriver = (): FileStorageDriver => {
  const candidates = [
    process.env.FILE_STORAGE_TYPE,
    process.env.STORAGE_TYPE, // legacy
    process.env.FILE_STORAGE_DRIVER, // legacy
  ];

  for (const candidate of candidates) {
    const normalized = candidate?.trim().toLowerCase();
    if (
      normalized === "local" ||
      normalized === "vercel-blob" ||
      normalized === "s3"
    ) {
      return normalized;
    }
  }

  if (IS_VERCEL_ENV) {
    return "vercel-blob";
  }

  return "local";
};

declare global {
  // eslint-disable-next-line no-var
  var __server__file_storage__: FileStorage | undefined;
}

const storageDriver = resolveDriver();

const createFileStorage = (): FileStorage => {
  switch (storageDriver) {
    case "local":
      return createLocalFileStorage();
    case "vercel-blob":
      return createVercelBlobStorage();
    case "s3":
      throw new Error(
        "The S3 storage driver is not implemented yet. Please configure FILE_STORAGE_TYPE=local or FILE_STORAGE_TYPE=vercel-blob.",
      );
    default: {
      const exhaustiveCheck: never = storageDriver;
      throw new Error(`Unsupported file storage driver: ${exhaustiveCheck}`);
    }
  }
};

const serverFileStorage =
  globalThis.__server__file_storage__ || createFileStorage();

if (IS_DEV) {
  globalThis.__server__file_storage__ = serverFileStorage;
}

export { serverFileStorage, storageDriver };
