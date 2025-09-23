import { NotImplementedError } from "lib/errors";
import type { FileStorage } from "./file-storage.interface";

export const createS3FileStorage = (): FileStorage => {
  throw new NotImplementedError(
    "S3 storage driver is not available yet. Implement createS3FileStorage before enabling FILE_STORAGE_TYPE=s3.",
  );
};
