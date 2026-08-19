import type { UIMessage } from "ai";
import type { ChatAttachment } from "app-types/chat";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/pg/db.pg", () => ({ pgDb: {} }));
vi.mock("@/lib/db/pg/schema.pg", () => ({
  MemberTable: {},
  UserTable: {},
}));
vi.mock("auth/server", () => ({ getSession: vi.fn() }));

import { buildInitialMessageParts } from "./route-helpers";

describe("buildInitialMessageParts", () => {
  test("makes a CSV source-url durable before the streamed turn starts", () => {
    const url =
      "https://x.supabase.co/storage/v1/object/public/attachments/u1/account.csv";
    const filename = "account-statement_21-Oct-2025_04-Aug-2026.csv";
    const currentParts = [
      {
        type: "text",
        text: `Attached files:\n1. ${filename} (text/csv)`,
        ingestionPreview: true,
      },
      {
        type: "text",
        text: "Create a visualization of our revenue in and out.",
      },
    ] as UIMessage["parts"];
    const attachments: ChatAttachment[] = [
      {
        type: "source-url",
        url,
        mediaType: "text/csv",
        filename,
      },
    ];

    const parts = buildInitialMessageParts(currentParts, attachments);

    expect(parts).toEqual([
      {
        type: "source-url",
        sourceId: url,
        url,
        mediaType: "text/csv",
        title: filename,
      },
      ...currentParts,
    ]);
  });
});
