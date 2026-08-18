"use server";

import { storageDriver } from "lib/file-storage";
import { IS_CLOUDFLARE_WORKER, IS_VERCEL_ENV } from "lib/const";

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
  if (storageDriver === "vercel-blob") {
    if (IS_CLOUDFLARE_WORKER) {
      return {
        isValid: false,
        error: "Vercel Blob is not supported on Cloudflare Workers",
        solution: "Use FILE_STORAGE_TYPE=s3 with Cloudflare R2 S3 API.",
      };
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        isValid: false,
        error: "BLOB_READ_WRITE_TOKEN is not set",
        solution:
          "Please add Vercel Blob to your project:\n" +
          "1. Go to your Vercel Dashboard\n" +
          "2. Navigate to Storage tab\n" +
          "3. Create a new Blob Store\n" +
          "4. Connect it to your project\n" +
          (IS_VERCEL_ENV
            ? "5. Redeploy your application"
            : "5. Run 'vercel env pull' to get the token locally"),
      };
    }

    return { isValid: true };
  }

  if (storageDriver === "s3") {
    const missing: string[] = [];
    if (!process.env.FILE_STORAGE_S3_BUCKET)
      missing.push("FILE_STORAGE_S3_BUCKET");
    if (!process.env.FILE_STORAGE_S3_REGION && !process.env.AWS_REGION) {
      missing.push("FILE_STORAGE_S3_REGION or AWS_REGION");
    }

    if (missing.length > 0) {
      return {
        isValid: false,
        error: `Missing S3 configuration: ${missing.join(", ")}`,
        solution:
          "Add required env vars for R2 S3-compatible file storage:\n" +
          "- FILE_STORAGE_TYPE=s3\n" +
          "- FILE_STORAGE_S3_BUCKET=your-r2-bucket\n" +
          "- FILE_STORAGE_S3_REGION=auto\n" +
          "- FILE_STORAGE_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com\n" +
          "- FILE_STORAGE_S3_FORCE_PATH_STYLE=1\n" +
          "- AWS_ACCESS_KEY_ID=...\n" +
          "- AWS_SECRET_ACCESS_KEY=...\n" +
          "(Optional) FILE_STORAGE_S3_PUBLIC_BASE_URL=https://cdn.example.com\n" +
          "(Optional) FILE_STORAGE_PREFIX=uploads",
      };
    }

    return { isValid: true };
  }

  return {
    isValid: false,
    error: `Invalid storage driver: ${storageDriver}`,
    solution: "FILE_STORAGE_TYPE must be 's3' or 'vercel-blob'.",
  };
}
