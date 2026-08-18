import type { HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "auth/server";
import { serverFileStorage, storageDriver } from "lib/file-storage";
import globalLogger from "lib/logger";
import { colorize } from "consola/utils";
import { checkStorageAction } from "../actions";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `[${storageDriver} Upload URL API]`),
});

// Constants
const DEFAULT_UPLOAD_EXPIRES_SECONDS = 3600; // 1 hour
const FALLBACK_UPLOAD_URL = "/api/storage/upload";

// Types
interface GenericUploadRequest {
  filename?: string;
  contentType?: string;
}

function isVercelBlobRequest(body: unknown): body is HandleUploadBody {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as HandleUploadBody).type === "blob.generate-client-token"
  );
}

async function handleVercelBlobUpload(
  body: HandleUploadBody,
  request: Request,
) {
  const { handleUpload } = await import("@vercel/blob/client");
  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => {
      return {
        allowedContentTypes: undefined,
        addRandomSuffix: true,
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      logger.info("Upload completed", {
        url: blob.url,
        pathname: blob.pathname,
        tokenPayload,
      });
    },
  });

  return NextResponse.json(jsonResponse);
}

/**
 * Handles generic upload URL request (S3, Local FS, etc.).
 * Returns presigned URL if supported, otherwise returns fallback response.
 */
async function handleGenericUpload(request: GenericUploadRequest) {
  // Check if storage backend supports direct upload
  if (typeof serverFileStorage.createUploadUrl !== "function") {
    logger.info("Storage doesn't support createUploadUrl, using fallback");
    return NextResponse.json({
      directUploadSupported: false,
      fallbackUrl: FALLBACK_UPLOAD_URL,
      message: "Use multipart/form-data upload to fallbackUrl",
    });
  }

  const uploadUrl = await serverFileStorage.createUploadUrl({
    filename: request.filename || "file",
    contentType: request.contentType || "application/octet-stream",
    expiresInSeconds: DEFAULT_UPLOAD_EXPIRES_SECONDS,
  });

  if (!uploadUrl) {
    logger.info("Storage returned null, using fallback");
    return NextResponse.json({
      directUploadSupported: false,
      fallbackUrl: FALLBACK_UPLOAD_URL,
      message: "Use multipart/form-data upload to fallbackUrl",
    });
  }

  // Provide a public source URL for clients to reference after successful PUT
  const sourceUrl = await serverFileStorage.getSourceUrl(uploadUrl.key);

  return NextResponse.json({
    directUploadSupported: true,
    ...uploadUrl,
    sourceUrl,
  });
}

/**
 * Upload URL endpoint.
 *
 * Provides direct upload credentials for the configured storage backend.
 */
export async function POST(request: Request) {
  // Authenticate
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check storage configuration first
  const storageCheck = await checkStorageAction();
  if (!storageCheck.isValid) {
    logger.error("Storage configuration error", {
      error: storageCheck.error,
      solution: storageCheck.solution,
    });

    return NextResponse.json(
      {
        error: storageCheck.error,
        solution: storageCheck.solution,
        storageDriver,
      },
      { status: 500 },
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (storageDriver === "vercel-blob" && isVercelBlobRequest(body)) {
      return await handleVercelBlobUpload(body, request);
    }

    return await handleGenericUpload(body as GenericUploadRequest);
  } catch (error) {
    logger.error("Upload URL generation failed", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 },
    );
  }
}
