import { Sandbox } from "@e2b/code-interpreter";
import { serverCache } from "lib/cache";

const SESSION_TTL_MS = 35 * 60 * 1000; // 35 minutes
const cacheKey = (threadId: string) => `e2b:${threadId}`;

export async function getOrCreateSession(threadId: string): Promise<string> {
  const existing = await serverCache.get<string>(cacheKey(threadId));
  if (existing) return existing;

  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY ?? "",
  });

  await serverCache.set(cacheKey(threadId), sandbox.sandboxId, SESSION_TTL_MS);
  return sandbox.sandboxId;
}

export async function refreshSession(
  threadId: string,
  sandboxId: string,
): Promise<void> {
  await serverCache.set(cacheKey(threadId), sandboxId, SESSION_TTL_MS);
}

export async function deleteSession(threadId: string): Promise<void> {
  await serverCache.delete(cacheKey(threadId));
}
