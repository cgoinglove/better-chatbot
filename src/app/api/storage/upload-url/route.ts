import { NextResponse } from "next/server";
import path from "node:path";
import { z } from "zod";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { serverFileStorage, storageDriver } from "lib/file-storage";
import type { UploadUrlOptions } from "lib/file-storage/file-storage.interface";
import {
  resolveStoragePrefix,
  sanitizeFilename,
} from "lib/file-storage/storage-utils";

const uploadRequestSchema = z.object({
  filename: z.string().min(1, "filename is required"),
  contentType: z.string().min(1, "contentType is required"),
  expiresInSeconds: z.number().int().positive().optional(),
});

const sanitizePathname = (pathname: string) => {
  const segments = pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => sanitizeFilename(segment));

  return segments.join("/") || sanitizeFilename("file");
};

const withBlobPrefix = (pathname: string) => {
  const prefix = resolveStoragePrefix();
  const normalized = sanitizePathname(pathname);
  return prefix ? path.posix.join(prefix, normalized) : normalized;
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (storageDriver === "vercel-blob") {
    if (!body || typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const handleBody = body as HandleUploadBody;

    if (handleBody.type === "blob.generate-client-token") {
      if (handleBody.payload?.pathname) {
        handleBody.payload.pathname = withBlobPrefix(
          handleBody.payload.pathname,
        );
      }

      const response = await handleUpload({
        request,
        body: handleBody,
        onBeforeGenerateToken: async (pathname) => ({
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        }),
        onUploadCompleted: async () => {
          // no-op; hook is exposed for integrators who need persistence
        },
      });

      return NextResponse.json(response);
    }

    if (handleBody.type === "blob.upload-completed") {
      const response = await handleUpload({
        request,
        body: handleBody,
        onBeforeGenerateToken: async () => ({ addRandomSuffix: true }),
        onUploadCompleted: async () => {},
      });

      return NextResponse.json(response);
    }

    return NextResponse.json(
      { error: "Unsupported Vercel Blob event" },
      { status: 400 },
    );
  }

  if (typeof serverFileStorage.createUploadUrl !== "function") {
    return NextResponse.json(
      { error: "Upload URLs are not supported for the active storage driver." },
      { status: 501 },
    );
  }

  const parseResult = uploadRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parseResult.data as UploadUrlOptions;

  const uploadUrl = await serverFileStorage.createUploadUrl?.(data);

  if (!uploadUrl) {
    return NextResponse.json(
      { error: "Upload URL generation failed" },
      { status: 500 },
    );
  }

  return NextResponse.json(uploadUrl);
}
