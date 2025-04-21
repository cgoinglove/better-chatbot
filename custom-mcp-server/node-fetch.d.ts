declare module "node-fetch" {
  export default function fetch(
    url: string | URL,
    init?: RequestInit,
  ): Promise<Response>;
  export class Response {
    ok: boolean;
    status: number;
    statusText: string;
    text(): Promise<string>;
    json<T = any>(): Promise<T>;
  }
  export interface RequestInit {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
    [key: string]: any;
  }
}
