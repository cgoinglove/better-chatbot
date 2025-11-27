import { AsyncLocalStorage } from "node:async_hooks";
import type { ChatModel } from "app-types/chat";

export type RequestContext = {
  userId?: string;
  userEmail?: string | null;
  userName?: string | null;
  threadId?: string;
  clientTimezone?: string;
  chatModel?: ChatModel;
};

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(
  context: RequestContext,
  callback: () => Promise<T> | T,
): Promise<T> | T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
