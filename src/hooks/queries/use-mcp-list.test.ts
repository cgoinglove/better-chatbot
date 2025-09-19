import { describe, it, expect, vi, beforeEach } from "vitest";

// Avoid Next server-only import errors pulled in indirectly via client hooks
vi.mock("server-only", () => ({}));

vi.mock("swr", async () => {
  const actual = await vi.importActual<any>("swr");
  return {
    ...actual,
    default: (key: string) => {
      if (key === "/api/mcp/list") {
        return {
          data: [
            {
              id: "A",
              name: "mine",
              config: { command: "x" },
              status: "connected",
              toolInfo: [],
              visibility: "private",
              isOwner: true,
            },
            {
              id: "B",
              name: "shared",
              config: { url: "https://x" },
              status: "connected",
              toolInfo: [],
              visibility: "public",
              ownerId: "U2",
              isOwner: false,
            },
          ],
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        };
      }
      return { data: undefined };
    },
  };
});

import { useMcpList } from "./use-mcp-list";

describe("useMcpList returns data; segmentation done by consumer", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns data and consumers can segment using isOwner", () => {
    const { data, isLoading } = useMcpList();
    expect(isLoading).toBe(false);
    expect(data.length).toBe(2);
    const my = data.filter((i) => i.isOwner).map((i) => i.id);
    const shared = data.filter((i) => !i.isOwner).map((i) => i.id);
    expect(my).toEqual(["A"]);
    expect(shared).toEqual(["B"]);
  });
});
