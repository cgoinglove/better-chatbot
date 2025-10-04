import { NotImplementedError } from "lib/errors";
import type { FileStorage } from "./file-storage.interface";

/**
 * Placeholder for an Amazon S3 (or S3-compatible) storage backend.
 *
 * When you implement this driver, consider:
 * - Reading configuration from FILE_STORAGE_S3_BUCKET / FILE_STORAGE_S3_REGION / FILE_STORAGE_PREFIX
 * - Mapping the FileStorage contract onto S3 operations (PutObject, GetObject, DeleteObject, HeadObject, etc.)
 * - Supporting presigned upload URLs when client-side uploads are required
 */
export const createS3FileStorage = (): FileStorage => {
  throw new NotImplementedError(
    "S3 storage driver not implemented. Implement createS3FileStorage before enabling FILE_STORAGE_TYPE=s3.",
  );
};
