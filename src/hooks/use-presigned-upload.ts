"use client";

import { useCallback, useState } from "react";
import type { UploadUrl } from "lib/file-storage/file-storage.interface";

interface UploadOptions {
  filename?: string;
  contentType?: string;
  expiresInSeconds?: number;
  fieldName?: string; // For POST based uploads (defaults to "file")
}

interface UsePresignedUploadOptions {
  endpoint?: string;
}

interface UploadResult {
  key: string;
}

async function performUpload(
  presigned: UploadUrl,
  file: File,
  contentType: string,
  fieldName: string,
) {
  if (presigned.method === "PUT") {
    const headers: Record<string, string> = {
      ...(presigned.headers ?? {}),
    };

    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = contentType;
    }

    const response = await fetch(presigned.url, {
      method: "PUT",
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file (status ${response.status}).`);
    }

    return;
  }

  // POST (e.g. S3 form upload)
  const formData = new FormData();
  if (presigned.fields) {
    Object.entries(presigned.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  formData.append(fieldName, file);

  const response = await fetch(presigned.url, {
    method: "POST",
    body: formData,
    headers: presigned.headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file (status ${response.status}).`);
  }
}

export function usePresignedUpload(options: UsePresignedUploadOptions = {}) {
  const { endpoint = "/api/storage/upload-url" } = options;
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (
      file: File,
      uploadOptions: UploadOptions = {},
    ): Promise<UploadResult> => {
      if (!(file instanceof File)) {
        throw new Error("upload() expects a File instance");
      }

      const filename = uploadOptions.filename ?? file.name ?? "file";
      const contentType =
        uploadOptions.contentType || file.type || "application/octet-stream";
      const fieldName = uploadOptions.fieldName ?? "file";

      setIsUploading(true);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename,
            contentType,
            expiresInSeconds: uploadOptions.expiresInSeconds,
          }),
        });

        if (!response.ok) {
          const errorBody = await safeParseJson(response);
          const message = errorBody?.error || "Failed to create upload URL";
          throw new Error(message);
        }

        const presigned = (await response.json()) as UploadUrl;

        await performUpload(presigned, file, contentType, fieldName);
        return { key: presigned.key };
      } finally {
        setIsUploading(false);
      }
    },
    [endpoint],
  );

  return {
    upload,
    isUploading,
  };
}

async function safeParseJson(response: Response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}
