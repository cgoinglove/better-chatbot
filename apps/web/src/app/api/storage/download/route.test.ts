import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
}));

vi.mock("auth/route-guard", () => ({
  withAuth:
    (
      handler: (
        request: Request,
        session: { user: { id: string } },
      ) => Promise<Response>,
    ) =>
    (request: Request) =>
      handler(request, { user: { id: "user_123" } }),
}));

vi.mock("lib/file-storage", () => ({
  serverFileStorage: { download: mocks.download },
}));

vi.mock("lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { FileNotFoundError } from "lib/errors";
import type { NextRequest } from "next/server";
import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

function request(key?: string) {
  const url = new URL("http://localhost/api/storage/download");
  if (key !== undefined) url.searchParams.set("key", key);
  return new Request(url) as unknown as NextRequest;
}

describe("GET /api/storage/download", () => {
  test("streams the file with attachment headers for the owner", async () => {
    mocks.download.mockResolvedValue(Buffer.from("XLS"));

    const res = await GET(
      request("user_123/0f3e2f10-1111-2222-3333-444455556666-report.xls"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/vnd.ms-excel");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="report.xls"',
    );
    expect(await res.text()).toBe("XLS");
  });

  test("rejects a missing or traversal key", async () => {
    expect((await GET(request())).status).toBe(400);
    expect((await GET(request("user_123/../other/file"))).status).toBe(400);
  });

  test("forbids keys owned by another user", async () => {
    const res = await GET(request("user_999/uuid-file.pdf"));
    expect(res.status).toBe(403);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  test("returns 404 for missing files and a generic 500 otherwise", async () => {
    mocks.download.mockRejectedValueOnce(new FileNotFoundError("k"));
    expect((await GET(request("user_123/uuid-a.pdf"))).status).toBe(404);

    mocks.download.mockRejectedValueOnce(new Error("supabase exploded"));
    const res = await GET(request("user_123/uuid-b.pdf"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Download failed" });
  });
});
