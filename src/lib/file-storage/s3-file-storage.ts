import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  FileStorage,
  UploadContent,
  UploadOptions,
  UploadResult,
  UploadUrlOptions,
  UploadUrl,
  FileMetadata,
} from "./file-storage.interface";

// ENV expected:
// - AWS_REGION
// - S3_BUCKET
// Optional:
// - S3_PUBLIC_BASE_URL (e.g., https://cdn.example.com)
// - S3_KEY_PREFIX (e.g., uploads/)
// - S3_DEFAULT_UPLOAD_URL_EXPIRY_SECONDS (e.g., 900)

type S3FileStorageOptions = {
  bucket: string;
  region: string;
  publicBaseUrl?: string;
  keyPrefix?: string;
  defaultUploadUrlExpirySeconds?: number;
};

export const createS3FileStorage = (): FileStorage => {
  const region =
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  if (!region) {
    throw new Error("Missing AWS_REGION (or AWS_DEFAULT_REGION/S3_REGION).");
  }
  if (!bucket) {
    throw new Error("Missing S3_BUCKET.");
  }

  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL || undefined;
  const keyPrefix = process.env.S3_KEY_PREFIX || undefined;
  const defaultUploadUrlExpirySeconds = process.env
    .S3_DEFAULT_UPLOAD_URL_EXPIRY_SECONDS
    ? Number(process.env.S3_DEFAULT_UPLOAD_URL_EXPIRY_SECONDS)
    : 900;

  const opts: S3FileStorageOptions = {
    bucket,
    region,
    publicBaseUrl,
    keyPrefix,
    defaultUploadUrlExpirySeconds,
  };

  return new S3FileStorage(opts);
};

class S3FileStorage implements FileStorage {
  private s3: S3Client;
  private bucket: string;
  private region: string;
  private publicBaseUrl?: string;
  private keyPrefix: string;
  private defaultUploadUrlExpirySeconds: number;

  constructor(opts: S3FileStorageOptions) {
    this.bucket = opts.bucket;
    this.region = opts.region;
    this.publicBaseUrl = opts.publicBaseUrl;
    this.keyPrefix = opts.keyPrefix ?? "";
    this.defaultUploadUrlExpirySeconds =
      opts.defaultUploadUrlExpirySeconds ?? 900;

    this.s3 = new S3Client({ region: this.region });
  }

  async upload(
    content: UploadContent,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const key = this.generateKey(options?.filename);
    const contentType =
      options?.contentType ||
      guessContentType(options?.filename) ||
      "application/octet-stream";

    const body = await toS3Body(content);
    const put = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: options?.filename ? { filename: options.filename } : undefined,
    });
    await this.s3.send(put);

    const head = await this.safeHead(key);

    const metadata: FileMetadata = {
      key,
      filename: options?.filename ?? extractNameFromKey(key),
      contentType: head?.ContentType || contentType,
      size: Number(head?.ContentLength ?? 0),
      uploadedAt: head?.LastModified,
    };

    return {
      key,
      sourceUrl: this.sourceUrlForKey(key),
      metadata,
    };
  }

  async createUploadUrl(options: UploadUrlOptions): Promise<UploadUrl | null> {
    const key = this.generateKey(options.filename);
    const expires =
      options.expiresInSeconds ?? this.defaultUploadUrlExpirySeconds;

    // Presigned PUT
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: options.contentType,
      Metadata: { filename: options.filename },
    });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn: expires });

    return {
      key,
      url,
      method: "PUT",
      expiresAt: new Date(Date.now() + expires * 1000),
      headers: {
        "content-type": options.contentType,
      },
    };
  }

  async download(key: string): Promise<Buffer> {
    const out = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = out.Body;
    if (!body) return Buffer.alloc(0);

    // Body can be a stream in Node. Collect to Buffer.
    const chunks: Buffer[] = [];
    const stream = isNodeReadable(body)
      ? body
      : Readable.fromWeb(body as ReadableStream);
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404) return false;
      if (err?.name === "NotFound") return false;
      return false;
    }
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    const head = await this.safeHead(key);
    if (!head) return null;

    return {
      key,
      filename: head.Metadata?.filename || extractNameFromKey(key),
      contentType: head.ContentType || "application/octet-stream",
      size: Number(head.ContentLength ?? 0),
      uploadedAt: head.LastModified,
    };
  }

  async getSourceUrl(key: string): Promise<string | null> {
    // Assumes objects are publicly readable, or you are fronting with CloudFront at publicBaseUrl.
    return this.sourceUrlForKey(key);
  }

  async getDownloadUrl(key: string): Promise<string | null> {
    // Generate a presigned GET to force download with Content-Disposition
    const filename = extractNameFromKey(key) || "download";
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeRFC5987ValueChars(
        filename,
      )}"`,
    });
    const url = await getSignedUrl(this.s3, cmd, {
      expiresIn: this.defaultUploadUrlExpirySeconds,
    });
    return url;
  }

  // Helpers

  private async safeHead(key: string) {
    try {
      return await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      return null;
    }
  }

  private generateKey(filename?: string): string {
    const safe = filename ? sanitizeFilename(filename) : randomKey(8);
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const base = `${y}/${m}/${d}/${randomKey(12)}-${safe}`;
    return this.keyPrefix ? `${this.keyPrefix}${base}` : base;
  }

  private sourceUrlForKey(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, "")}/${encodeS3Key(key)}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodeS3Key(
      key,
    )}`;
  }
}

// Utilities

import { Readable } from "node:stream";

function isNodeReadable(x: any): x is NodeJS.ReadableStream {
  return x && typeof x.pipe === "function";
}

async function toS3Body(content: UploadContent): Promise<any> {
  if (Buffer.isBuffer(content)) return content;
  if (isNodeReadable(content)) return content;
  if (typeof Blob !== "undefined" && content instanceof Blob)
    return content.stream?.() ?? content;
  if (
    typeof ReadableStream !== "undefined" &&
    content instanceof ReadableStream
  )
    return Readable.fromWeb(content);
  if (content instanceof ArrayBuffer) return Buffer.from(content);
  if (ArrayBuffer.isView(content)) return Buffer.from(content.buffer);
  // Fallback
  return content as any;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 200);
}

function extractNameFromKey(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

function randomKey(len = 16): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[(Math.random() * chars.length) | 0];
  }
  return out;
}

function encodeS3Key(key: string): string {
  return key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function encodeRFC5987ValueChars(str: string): string {
  return encodeURIComponent(str)
    .replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%(7C|60|5E)/g, (m) => m.toLowerCase());
}
