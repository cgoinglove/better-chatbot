import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export function getWorkspacePath(userId: string) {
  const base = "/tmp";
  const dir = join(base, `studio-${userId}`);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}
