"use server";

import { storageDriver } from "lib/file-storage";
import { IS_VERCEL_ENV } from "lib/const";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Get storage configuration info.
 * Used by clients to determine upload strategy.
 */
export async function getStorageInfoAction() {
  return {
    type: storageDriver,
    supportsDirectUpload:
      storageDriver === "vercel-blob" || storageDriver === "s3",
  };
}

interface StorageCheckResult {
  isValid: boolean;
  error?: string;
  solution?: string;
}

/**
 * Check if storage is properly configured.
 * Returns detailed error messages with solutions.
 */
export async function checkStorageAction(): Promise<StorageCheckResult> {
  // 1. Check Vercel Blob configuration
  if (storageDriver === "vercel-blob") {
    if (IS_VERCEL_ENV && !process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        isValid: false,
        error: "Vercel Blob is not configured",
        solution:
          "Please add Vercel Blob to your project:\n" +
          "1. Go to your Vercel Dashboard\n" +
          "2. Navigate to Storage tab\n" +
          "3. Create a new Blob Store\n" +
          "4. Connect it to your project\n" +
          "5. Redeploy your application",
      };
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        isValid: false,
        error: "BLOB_READ_WRITE_TOKEN is not set",
        solution:
          "Please set BLOB_READ_WRITE_TOKEN in your environment variables.\n" +
          "You can get this token from Vercel Blob dashboard.",
      };
    }
  }

  // 2. Check S3 configuration
  if (storageDriver === "s3") {
    return {
      isValid: false,
      error: "S3 storage is not yet implemented",
      solution:
        "S3 storage support is coming soon.\n" +
        "For now, please use:\n" +
        "- Local storage (default)\n" +
        "- Vercel Blob (for Vercel deployments)",
    };
  }

  // 3. Check Local storage configuration
  if (storageDriver === "local") {
    // Local storage is not supported on Vercel (serverless environment)
    if (IS_VERCEL_ENV) {
      return {
        isValid: false,
        error: "Local storage is not supported on Vercel",
        solution:
          "Vercel uses serverless functions and doesn't support persistent file system.\n" +
          "Please use Vercel Blob instead:\n" +
          "1. Go to your Vercel Dashboard\n" +
          "2. Navigate to Storage tab\n" +
          "3. Create a new Blob Store\n" +
          "4. Connect it to your project\n" +
          "5. Set FILE_STORAGE_TYPE=vercel-blob in environment variables\n" +
          "6. Redeploy your application",
      };
    }

    try {
      const publicRoot = path.resolve(
        process.env.FILE_STORAGE_LOCAL_PUBLIC_ROOT ??
          path.join(process.cwd(), "public"),
      );

      const storagePrefix =
        process.env.FILE_STORAGE_PREFIX?.trim().replace(/^\/+|\/+$/g, "") ||
        "uploads";

      const targetDir = path.join(publicRoot, storagePrefix);

      // Try to create directory if it doesn't exist
      await fs.mkdir(targetDir, { recursive: true });

      // Check write permission
      await fs.access(targetDir, fs.constants.W_OK);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        isValid: false,
        error: `Local storage directory is not writable: ${errorMessage}`,
        solution:
          "Please ensure:\n" +
          "1. The storage directory exists\n" +
          "2. Your application has write permissions\n" +
          "3. Check FILE_STORAGE_LOCAL_PUBLIC_ROOT and FILE_STORAGE_PREFIX in .env\n" +
          "4. If deploying to serverless (Vercel, AWS Lambda), use cloud storage instead",
      };
    }
  }

  // 4. Check if storage driver is valid
  if (!["local", "vercel-blob", "s3"].includes(storageDriver)) {
    return {
      isValid: false,
      error: `Invalid storage driver: ${storageDriver}`,
      solution:
        "FILE_STORAGE_TYPE must be one of:\n" +
        "- 'local' (default)\n" +
        "- 'vercel-blob'\n" +
        "- 's3' (coming soon)",
    };
  }

  return {
    isValid: true,
  };
}
