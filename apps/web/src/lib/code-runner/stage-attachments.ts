import "server-only";
import { CHAT_MESSAGE_WINDOW } from "lib/const";
import { chatRepository } from "lib/db/repository";
import { errorLabel } from "lib/e2b/create-sandbox";
import { serverFileStorage } from "lib/file-storage";
import logger from "lib/logger";

/** A file downloaded from storage, ready to be written into the sandbox. */
export type StagedFile = { filename: string; bytes: Buffer };

/** Per-file cap — mirrors the sandbox download limit in the file route. */
export const MAX_STAGED_FILE_BYTES = 50 * 1024 * 1024;
/** Total bytes staged per execution, so one thread can't fill the sandbox. */
export const MAX_STAGED_TOTAL_BYTES = 100 * 1024 * 1024;
/** Upper bound on the number of files staged per execution. */
export const MAX_STAGED_FILES = 20;
/** Leave room below Linux's 255-byte basename limit for collision suffixes. */
export const MAX_STAGED_FILENAME_BYTES = 240;

const ATTACHMENT_BUCKET =
  process.env.SUPABASE_ATTACHMENT_BUCKET || "attachments";

/**
 * Derive the storage object key from a Supabase storage URL, e.g.
 * `https://x/storage/v1/object/public/attachments/user/doc.csv` →
 * `user/doc.csv`. Returns null for anything that is not such a URL (data URIs,
 * bare keys, external links) so callers skip it instead of fetching it — we
 * only ever read from our own storage, never an arbitrary model-provided URL.
 */
export function storageKeyFromUrl(raw: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(raw).pathname;
  } catch {
    return null;
  }
  const marker = "/object/";
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;
  // "public/attachments/<key>" | "sign/attachments/<key>" | "authenticated/…"
  const afterObject = pathname
    .slice(idx + marker.length)
    .replace(/^(public|sign|authenticated)\//, "");
  const slash = afterObject.indexOf("/");
  if (slash === -1) return null;
  const bucket = afterObject.slice(0, slash);
  if (bucket !== ATTACHMENT_BUCKET) return null;
  const key = afterObject.slice(slash + 1);
  if (!key) return null;
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

/**
 * TUS uploads are stored below the authenticated user's id. Thread ownership
 * alone is not enough: a forged part in an owned thread must not make the
 * service-role storage client download another user's key.
 */
export function isUserOwnedStorageKey(key: string, userId: string): boolean {
  const normalized = key.replace(/\\/g, "/");
  return (
    !normalized.split("/").includes("..") && normalized.startsWith(`${userId}/`)
  );
}

function attachmentUrl(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value instanceof URL) return value.toString();
  if (
    value &&
    typeof value === "object" &&
    "href" in value &&
    typeof value.href === "string"
  ) {
    return value.href;
  }
  return null;
}

/**
 * Reduce an arbitrary attachment name to a safe basename that Python can open
 * by the same name the model saw. Strips any directory portion and replaces
 * unsafe characters; never returns an empty string.
 */
export function sanitizeStagedFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  // Linux supports spaces, Unicode and punctuation in basenames. Preserve
  // those so model-authored code can open the exact filename shown in chat;
  // only path/control characters and filesystem length limits need handling.
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "_");
  if (!cleaned || cleaned === "." || cleaned === "..") return "attachment";
  if (Buffer.byteLength(cleaned, "utf8") <= MAX_STAGED_FILENAME_BYTES) {
    return cleaned;
  }

  const dot = cleaned.lastIndexOf(".");
  const possibleExtension = dot > 0 ? cleaned.slice(dot) : "";
  const extension =
    Buffer.byteLength(possibleExtension, "utf8") <= 32 ? possibleExtension : "";
  const stem = extension ? cleaned.slice(0, -extension.length) : cleaned;
  let truncatedStem = "";
  for (const character of stem) {
    if (
      Buffer.byteLength(`${truncatedStem}${character}${extension}`, "utf8") >
      MAX_STAGED_FILENAME_BYTES
    ) {
      break;
    }
    truncatedStem += character;
  }
  return truncatedStem ? `${truncatedStem}${extension}` : "attachment";
}

/**
 * Deterministically suffix a filename when a different file already claimed it,
 * inserting the counter before the extension: `data.csv` → `data-1.csv`.
 * Mutates `seen` so repeated calls keep producing fresh names.
 */
export function dedupeStagedName(name: string, seen: Set<string>): string {
  if (!seen.has(name)) {
    seen.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  let candidate = `${stem}-${i}${ext}`;
  while (seen.has(candidate)) {
    i += 1;
    candidate = `${stem}-${i}${ext}`;
  }
  seen.add(candidate);
  return candidate;
}

/**
 * Collect the attachments of a thread as sandbox-ready files. Both the thread
 * and each storage key must belong to the caller. CSV/PDF uploads are persisted
 * as `source-url` + `title`, while native AI file parts can use either `url` or
 * `data`, so normalize all of those shapes here.
 */
export async function collectThreadAttachments(
  threadId: string,
  userId: string,
): Promise<StagedFile[]> {
  const hasAccess = await chatRepository.checkAccess(threadId, userId);
  if (!hasAccess) return [];

  const messages = await chatRepository.selectMessagesByThreadId(threadId, {
    limit: CHAT_MESSAGE_WINDOW,
  });

  const seenKeys = new Set<string>();
  const seenNames = new Set<string>();
  const files: StagedFile[] = [];
  let totalBytes = 0;

  // Prefer the newest attachment when separate turns reuse a visible filename;
  // model-authored code refers to the current turn's unsuffixed name.
  for (const message of [...messages].reverse()) {
    for (const part of message.parts ?? []) {
      if (files.length >= MAX_STAGED_FILES) return files;
      const candidate = part as {
        type?: string;
        url?: unknown;
        data?: unknown;
        filename?: unknown;
        title?: unknown;
      };
      if (candidate.type !== "file" && candidate.type !== "source-url") {
        continue;
      }

      const url = attachmentUrl(candidate.url) ?? attachmentUrl(candidate.data);
      if (!url) continue;

      const key = storageKeyFromUrl(url);
      if (!key || !isUserOwnedStorageKey(key, userId) || seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);

      let bytes: Buffer;
      try {
        bytes = await serverFileStorage.download(key);
      } catch (err) {
        logger.warn(
          `[e2b] stage attachment download failed key=${key} error=${errorLabel(err)}`,
        );
        continue;
      }

      if (bytes.byteLength > MAX_STAGED_FILE_BYTES) {
        logger.warn(
          `[e2b] stage attachment skipped (over ${MAX_STAGED_FILE_BYTES}B) key=${key} bytes=${bytes.byteLength}`,
        );
        continue;
      }
      if (totalBytes + bytes.byteLength > MAX_STAGED_TOTAL_BYTES) return files;
      totalBytes += bytes.byteLength;

      const rawName =
        typeof candidate.filename === "string" && candidate.filename.length > 0
          ? candidate.filename
          : typeof candidate.title === "string" && candidate.title.length > 0
            ? candidate.title
            : key;
      const filename = dedupeStagedName(
        sanitizeStagedFilename(rawName),
        seenNames,
      );
      files.push({ filename, bytes });
    }
  }

  return files;
}
