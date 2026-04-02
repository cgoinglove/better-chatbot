import { Sandbox } from "@e2b/code-interpreter";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";

const SESSION_TTL_MS = 35 * 60 * 1000; // 35 minutes

export async function getOrCreateSession(threadId: string): Promise<string> {
  const existing = await serverCache.get<string>(
    CacheKeys.e2bSession(threadId),
  );
  if (existing) return existing;

  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    throw new Error("E2B_API_KEY environment variable is not set");
  }
  const sandbox = await Sandbox.create({ apiKey });

  // Pre-install file generation libraries so Python can create PPTX, DOCX, PDF, Excel
  await sandbox.runCode(
    "import subprocess; result = subprocess.run(['pip', 'install', '-q', 'python-pptx', 'python-docx', 'reportlab', 'xlsxwriter', 'Pillow'], capture_output=True, text=True); print('packages ready')",
  );

  await serverCache.set(
    CacheKeys.e2bSession(threadId),
    sandbox.sandboxId,
    SESSION_TTL_MS,
  );
  return sandbox.sandboxId;
}

export async function refreshSession(
  threadId: string,
  sandboxId: string,
): Promise<void> {
  await serverCache.set(
    CacheKeys.e2bSession(threadId),
    sandboxId,
    SESSION_TTL_MS,
  );
}

export async function deleteSession(threadId: string): Promise<void> {
  await serverCache.delete(CacheKeys.e2bSession(threadId));
}
