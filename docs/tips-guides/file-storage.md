# File Storage Setup

> **Note**: This documentation was written by Claude 3.5 Sonnet.

This project supports **multiple file storage backends** for handling file uploads and downloads.

## Overview

Files are stored with **public access** by default, making them accessible via URL. This is useful for sharing uploaded content, displaying images, and integrating with external services.

## Storage Drivers

The project supports three storage backends:

- **Local Filesystem** - For self-hosted deployments (Docker, VPS)
- **Vercel Blob** - For Vercel deployments (default on Vercel)
- **S3** - Planned for AWS/S3-compatible storage

The storage driver is automatically selected based on your deployment environment or can be explicitly configured via `FILE_STORAGE_TYPE`.

## Configuration

### Environment Variables

```ini
# Storage driver selection (auto-detected if not set)
FILE_STORAGE_TYPE=local # or vercel-blob, s3

# Optional: Subdirectory prefix for organizing files
FILE_STORAGE_PREFIX=uploads

# === Local Filesystem (FILE_STORAGE_TYPE=local) ===
FILE_STORAGE_LOCAL_PUBLIC_ROOT=./public # defaults to ./public

# === Vercel Blob (FILE_STORAGE_TYPE=vercel-blob) ===
BLOB_READ_WRITE_TOKEN=<auto on Vercel>
VERCEL_BLOB_CALLBACK_URL= # Optional: For local webhook testing with ngrok

# === S3 (FILE_STORAGE_TYPE=s3, not yet implemented) ===
# FILE_STORAGE_S3_BUCKET=
# FILE_STORAGE_S3_REGION=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
```

### Quick Start by Deployment Type

#### Local Filesystem (Docker, VPS, Local Dev)

The default for non-Vercel environments. Files are stored in `public/uploads/` and served by Next.js.

```ini
# .env (optional, this is the default)
FILE_STORAGE_TYPE=local
FILE_STORAGE_PREFIX=uploads
```

No additional setup required! Files are automatically publicly accessible.

#### Vercel Blob (Vercel Deployment)

Automatically enabled on Vercel. For local testing with Vercel Blob:

1. Go to your Vercel project → **Storage** tab
2. Click **Connect Database** → **Blob** → **Continue**
3. Name it (e.g., "Files") and click **Create**
4. Pull environment variables locally:

```bash
vercel env pull
```

## Client Upload

The `useFileUpload` hook **automatically selects the optimal upload method** based on your storage backend:

- **Vercel Blob**: Direct browser → CDN upload (fastest)
- **S3**: Presigned URL upload (when implemented)
- **Local FS**: Browser → Server → Filesystem (fallback)

```tsx
"use client";

import { useFileUpload } from "hooks/use-presigned-upload";

function FileUploadComponent() {
  const { upload, isUploading } = useFileUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file);
    if (!result) return; // Upload failed (error shown via toast)

    // File uploaded successfully
    console.log("Public URL:", result.url);
    console.log("Pathname (key):", result.pathname);
  };

  return (
    <input type="file" onChange={handleFileChange} disabled={isUploading} />
  );
}
```

### Upload Flow

#### Vercel Blob (Direct Upload)

```mermaid
sequenceDiagram
  participant Browser
  participant UploadURL as /api/storage/upload-url
  participant Vercel as Vercel Blob CDN

  Browser->>UploadURL: POST (request client token)
  Note over Browser,UploadURL: User authenticated
  UploadURL->>Vercel: Generate client token
  Vercel-->>UploadURL: Return token
  UploadURL-->>Browser: Return token + URL
  Browser->>Vercel: PUT file (with token)
  Vercel-->>Browser: Upload complete
  Vercel->>UploadURL: Webhook: upload completed
  Note over UploadURL: Optional: Save to DB
```

#### Local Filesystem (Server Upload)

```mermaid
sequenceDiagram
  participant Browser
  participant UploadAPI as /api/storage/upload
  participant Storage as Local Filesystem

  Browser->>UploadAPI: POST multipart/form-data
  Note over Browser,UploadAPI: User authenticated
  UploadAPI->>Storage: Write file to disk
  Storage-->>UploadAPI: File written
  UploadAPI-->>Browser: Return public URL
  Note over Browser: File accessible at /uploads/...
```

### Features

- ✅ **Multi-Backend Support**: Local FS, Vercel Blob, S3 (planned)
- ✅ **Automatic Driver Selection**: Based on deployment environment
- ✅ **Optimal Upload Strategy**: Direct upload when supported, server fallback otherwise
- ✅ **Public Access**: All files get public URLs
- ✅ **Authentication**: Users must be logged in to upload
- ✅ **Collision Prevention**: UUID-based file naming
- ✅ **Type Safety**: Full TypeScript support with unified interface

## Server-Side Upload

For server-side uploads (e.g., programmatically generated files):

```ts
import { serverFileStorage } from "lib/file-storage";

const result = await serverFileStorage.upload(buffer, {
  filename: "generated-image.png",
  contentType: "image/png",
});

console.log("Public URL:", result.sourceUrl);
```

## Upload Completion Webhook

The `/api/storage/upload-url` endpoint handles the `onUploadCompleted` webhook from Vercel Blob. You can add custom logic here:

```ts
// src/app/api/storage/upload-url/route.ts

onUploadCompleted: async ({ blob, tokenPayload }) => {
  const { userId } = JSON.parse(tokenPayload);

  // Save to database
  await db.files.create({
    url: blob.url,
    pathname: blob.pathname,
    userId,
    size: blob.size,
    contentType: blob.contentType,
  });

  // Send notification
  // await sendNotification(userId, "File uploaded!");
};
```

## Advanced

### Local Development with Vercel Blob Webhooks

To test Vercel Blob's `onUploadCompleted` webhook locally, use [ngrok](https://ngrok.com/):

```bash
# Terminal 1: Start your app
pnpm dev

# Terminal 2: Start ngrok
ngrok http 3000

# Add to .env.local
VERCEL_BLOB_CALLBACK_URL=https://abc123.ngrok-free.app
```

Without ngrok, uploads will work but `onUploadCompleted` won't be called locally.

### Custom Storage Backend

To implement a custom storage driver (e.g., Cloudflare R2, MinIO):

1. Create a new file in `src/lib/file-storage/` (e.g., `r2-file-storage.ts`)
2. Implement the `FileStorage` interface from `file-storage.interface.ts`
3. Add your driver to `index.ts`
4. Update `FILE_STORAGE_TYPE` environment variable

The `FileStorage` interface provides:

- `upload()` - Server-side file upload
- `createUploadUrl()` - Generate presigned URL for client uploads (optional)
- `download()`, `delete()`, `exists()`, `getMetadata()`, `getSourceUrl()`

### Storage Comparison

| Feature              | Local FS        | Vercel Blob        | S3 (Planned)       |
| -------------------- | --------------- | ------------------ | ------------------ |
| Direct Client Upload | ❌ Server proxy | ✅ Yes             | ✅ Yes (presigned) |
| CDN                  | ❌ No           | ✅ Global          | Configurable       |
| Cost                 | Free            | Pay-as-you-go      | Pay-as-you-go      |
| Best For             | Self-hosted     | Vercel deployments | AWS ecosystem      |
| Setup Complexity     | None            | Minimal            | Moderate           |
