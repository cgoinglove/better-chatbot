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
            },
            {
              id: "B",
              name: "shared",
              config: { url: "https://x" },
              status: "connected",
              toolInfo: [],
              visibility: "public",
              ownerId: "U2",
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

describe("useMcpList segmentation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("segments my and shared mcps via ownerId presence", () => {
    const { items, myMcps, sharedMcps, isLoading } = useMcpList();
    expect(isLoading).toBe(false);
    expect(items.length).toBe(2);
    expect(myMcps.map((i) => i.id)).toEqual(["A"]);
    expect(sharedMcps.map((i) => i.id)).toEqual(["B"]);
  });
});
