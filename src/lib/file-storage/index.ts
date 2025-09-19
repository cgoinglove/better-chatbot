import "server-only";
import { FileStorage } from "./file-storage.interface";
import { IS_DEV } from "lib/const";

declare global {
  // eslint-disable-next-line no-var
  var __server__file_storage__: FileStorage | undefined;
}

const createFileStorage = (): FileStorage => {
  return {} as FileStorage;
};

const serverFileStorage =
  globalThis.__server__file_storage__ || createFileStorage();

if (IS_DEV) {
  globalThis.__server__file_storage__ = serverFileStorage;
}

export { serverFileStorage };
