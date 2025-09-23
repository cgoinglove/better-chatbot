import { Buffer } from "node:buffer";
import type { UploadContent } from "./file-storage.interface";

export const sanitizeFilename = (filename: string) => {
  const base = filename.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
};

export const resolveStoragePrefix = () => {
  const raw =
    process.env.FILE_STORAGE_PREFIX ??
    process.env.FILE_STORAGE_BLOB_PREFIX ??
    process.env.FILE_STORAGE_LOCAL_PREFIX ??
    "uploads";

  return raw.replace(/^\/+|\/+$|\.+/g, "").trim();
};

const isArrayBufferLike = (value: unknown): value is ArrayBuffer =>
  value instanceof ArrayBuffer;

const isArrayBufferView = (value: unknown): value is ArrayBufferView =>
  ArrayBuffer.isView(value as ArrayBufferView);

const isBlobLike = (value: unknown): value is Blob =>
  typeof Blob !== "undefined" && value instanceof Blob;

const isWebReadableStream = (
  value: unknown,
): value is ReadableStream<Uint8Array> =>
  typeof ReadableStream !== "undefined" && value instanceof ReadableStream;

const isNodeReadableStream = (value: unknown): value is NodeJS.ReadableStream =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as NodeJS.ReadableStream).pipe === "function";

const nodeStreamToBuffer = async (stream: NodeJS.ReadableStream) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });

const webStreamToBuffer = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const joined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return Buffer.from(joined);
};

export const toBuffer = async (content: UploadContent) => {
  if (Buffer.isBuffer(content)) {
    return content;
  }

  if (isArrayBufferLike(content)) {
    return Buffer.from(content);
  }

  if (isArrayBufferView(content)) {
    return Buffer.from(content.buffer, content.byteOffset, content.byteLength);
  }

  if (isBlobLike(content)) {
    const arrayBuffer = await content.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (isWebReadableStream(content)) {
    return webStreamToBuffer(content);
  }

  if (isNodeReadableStream(content)) {
    return nodeStreamToBuffer(content);
  }

  throw new TypeError("Unsupported upload content type");
};
