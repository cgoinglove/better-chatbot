import "server-only";

/**
 * Checks if file storage is properly configured.
 * Returns true if either Vercel Blob or S3 credentials are available.
 */
export function isFileStorageConfigured(): boolean {
  // Check for Vercel Blob token
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return true;
  }

  // Check for S3 configuration
  const hasS3Bucket = Boolean(process.env.FILE_STORAGE_S3_BUCKET);
  const hasS3Type = process.env.FILE_STORAGE_TYPE === "s3";

  // S3 is considered configured if:
  // 1. FILE_STORAGE_TYPE is set to "s3" AND bucket is specified
  // 2. Will work with either explicit credentials OR IAM role (in AWS environment)
  if (hasS3Type && hasS3Bucket) {
    return true; // Assume IAM role or credentials are available
  }

  return false;
}
