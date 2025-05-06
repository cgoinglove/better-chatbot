import { IS_DEV } from "lib/const";
import { MemoryCache } from "./memory-cache";

let serverCache: MemoryCache;

declare global {
  // eslint-disable-next-line no-var
  var __server__cache__: MemoryCache | undefined;
}

if (IS_DEV) {
  if (!globalThis.__server_cache__) {
    globalThis.__server_cache__ = new MemoryCache();
  }
  serverCache = globalThis.__server_cache__;
} else {
  serverCache = new MemoryCache();
}

export { serverCache };
