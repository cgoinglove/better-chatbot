# Python Interpreter & Excel Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add E2B-backed stateful Python execution to better-chatbot, enabling claude.ai-style Excel/CSV file analysis with a sliding Artifacts side panel.

**Architecture:** A new `execute_python` server-side tool closes over the thread ID and calls the E2B Code Interpreter API. A session manager persists sandbox IDs in the existing `serverCache` (Redis-backed) keyed by thread, so variables and loaded DataFrames persist across follow-up messages. Results (stdout + base64 PNG charts) render in a sliding `ArtifactsPanel` component opened via Zustand.

**Tech Stack:** `@e2b/code-interpreter`, `xlsx` (server-side Excel parsing), Vercel AI SDK v5 `tool()`, Zustand, Framer Motion, Vitest

---

## Task 1: Install Dependencies & Configure Environment

**Files:**
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Install packages**

```bash
cd "/Users/chrisbenson/Documents - Local/GitHub/better-chatbot"
pnpm add @e2b/code-interpreter xlsx
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Add E2B_API_KEY to .env**

Add this line to `.env` (use your real key from e2b.dev):
```
E2B_API_KEY=your_e2b_api_key_here
```

- [ ] **Step 3: Document in .env.example**

In `.env.example`, add after the `ANTHROPIC_API_KEY` line:
```
E2B_API_KEY=****
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/Users/chrisbenson/Documents - Local/GitHub/better-chatbot"
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: install @e2b/code-interpreter and xlsx packages"
```

---

## Task 2: Define Shared E2B Types

**Files:**
- Create: `src/lib/e2b/types.ts`

- [ ] **Step 1: Create the types file**

Create `src/lib/e2b/types.ts`:
```typescript
export interface E2BExecutionImage {
  base64: string;
  format: string;
}

export interface E2BExecutionResult {
  stdout: string;
  stderr: string;
  images: E2BExecutionImage[];
  sessionId: string;
}

export interface ArtifactData {
  id: string;
  code: string;
  stdout: string;
  stderr?: string;
  images: E2BExecutionImage[];
  title: string;
  sessionId: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/e2b/types.ts
git commit -m "feat: add E2B shared types"
```

---

## Task 3: E2B Session Manager

**Files:**
- Create: `src/lib/e2b/session-manager.ts`
- Create: `src/lib/e2b/session-manager.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/e2b/session-manager.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrCreateSession, refreshSession, deleteSession } from "./session-manager";

// Mock serverCache
vi.mock("lib/cache", () => ({
  serverCache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock @e2b/code-interpreter
vi.mock("@e2b/code-interpreter", () => ({
  Sandbox: {
    create: vi.fn().mockResolvedValue({ sandboxId: "sandbox-abc123" }),
    connect: vi.fn().mockResolvedValue({ sandboxId: "sandbox-abc123" }),
  },
}));

import { serverCache } from "lib/cache";
import { Sandbox } from "@e2b/code-interpreter";

describe("getOrCreateSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new sandbox when no session exists", async () => {
    vi.mocked(serverCache.get).mockResolvedValue(undefined);

    const sandboxId = await getOrCreateSession("thread-1");

    expect(Sandbox.create).toHaveBeenCalledWith({
      apiKey: expect.any(String),
    });
    expect(serverCache.set).toHaveBeenCalledWith(
      "e2b:thread-1",
      "sandbox-abc123",
      35 * 60 * 1000,
    );
    expect(sandboxId).toBe("sandbox-abc123");
  });

  it("returns existing sandbox ID when session exists", async () => {
    vi.mocked(serverCache.get).mockResolvedValue("sandbox-existing");

    const sandboxId = await getOrCreateSession("thread-1");

    expect(Sandbox.create).not.toHaveBeenCalled();
    expect(sandboxId).toBe("sandbox-existing");
  });
});

describe("refreshSession", () => {
  it("resets the TTL for an existing session", async () => {
    await refreshSession("thread-1", "sandbox-abc123");

    expect(serverCache.set).toHaveBeenCalledWith(
      "e2b:thread-1",
      "sandbox-abc123",
      35 * 60 * 1000,
    );
  });
});

describe("deleteSession", () => {
  it("removes the session from cache", async () => {
    await deleteSession("thread-1");
    expect(serverCache.delete).toHaveBeenCalledWith("e2b:thread-1");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run src/lib/e2b/session-manager.test.ts 2>&1 | tail -15
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the session manager**

Create `src/lib/e2b/session-manager.ts`:
```typescript
import { Sandbox } from "@e2b/code-interpreter";
import { serverCache } from "lib/cache";

const SESSION_TTL_MS = 35 * 60 * 1000; // 35 minutes
const cacheKey = (threadId: string) => `e2b:${threadId}`;

export async function getOrCreateSession(threadId: string): Promise<string> {
  const existing = await serverCache.get<string>(cacheKey(threadId));
  if (existing) return existing;

  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY!,
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/lib/e2b/session-manager.test.ts 2>&1 | tail -10
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/e2b/
git commit -m "feat: add E2B session manager with Redis persistence"
```

---

## Task 4: execute_python Server Tool

**Files:**
- Create: `src/lib/ai/tools/code/execute-python-server.ts`
- Create: `src/lib/ai/tools/code/execute-python-server.test.ts`
- Modify: `src/lib/ai/tools/index.ts`

- [ ] **Step 1: Add ExecutePython to the DefaultToolName enum**

In `src/lib/ai/tools/index.ts`, add one line inside `DefaultToolName`:
```typescript
export enum DefaultToolName {
  CreatePieChart = "createPieChart",
  CreateBarChart = "createBarChart",
  CreateLineChart = "createLineChart",
  CreateTable = "createTable",
  WebSearch = "webSearch",
  WebContent = "webContent",
  Http = "http",
  JavascriptExecution = "mini-javascript-execution",
  PythonExecution = "python-execution",
  ExecutePython = "execute_python",  // E2B server-side tool
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/ai/tools/code/execute-python-server.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lib/e2b/session-manager", () => ({
  getOrCreateSession: vi.fn().mockResolvedValue("sandbox-abc"),
  refreshSession: vi.fn(),
}));

vi.mock("@e2b/code-interpreter", () => ({
  Sandbox: {
    connect: vi.fn().mockResolvedValue({
      sandboxId: "sandbox-abc",
      notebook: {
        execCell: vi.fn().mockResolvedValue({
          results: [],
          logs: { stdout: ["hello world\n"], stderr: [] },
          error: undefined,
        }),
      },
      files: {
        write: vi.fn(),
      },
    }),
  },
}));

import { createExecutePythonTool } from "./execute-python-server";
import { Sandbox } from "@e2b/code-interpreter";

describe("createExecutePythonTool", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a tool with execute function", () => {
    const tool = createExecutePythonTool("thread-1");
    expect(tool.execute).toBeDefined();
  });

  it("executes code and returns stdout", async () => {
    const tool = createExecutePythonTool("thread-1");
    const result = await tool.execute!({ code: "print('hello world')" }, {} as any);

    expect(result.stdout).toBe("hello world\n");
    expect(result.stderr).toBe("");
    expect(result.images).toEqual([]);
    expect(result.sessionId).toBe("sandbox-abc");
  });

  it("uploads file when fileUrl and fileName provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }) as any;

    const tool = createExecutePythonTool("thread-1");
    await tool.execute!(
      { code: "print('hi')", fileUrl: "https://example.com/file.xlsx", fileName: "file.xlsx" },
      {} as any,
    );

    const mockSandbox = await (Sandbox.connect as any).mock.results[0].value;
    expect(mockSandbox.files.write).toHaveBeenCalledWith(
      "/home/user/file.xlsx",
      expect.any(Uint8Array),
    );
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm vitest run src/lib/ai/tools/code/execute-python-server.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the tool factory**

Create `src/lib/ai/tools/code/execute-python-server.ts`:
```typescript
import { tool } from "ai";
import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import { getOrCreateSession, refreshSession } from "lib/e2b/session-manager";
import type { E2BExecutionResult } from "lib/e2b/types";

export function createExecutePythonTool(threadId: string) {
  return tool({
    description:
      "Execute Python code in a persistent server-side sandbox. Use for data analysis, Excel/CSV file processing, and chart generation. Files uploaded via fileUrl are available at /home/user/{fileName}. Variables and imports persist across messages in this conversation.",
    parameters: z.object({
      code: z.string().describe("Python code to execute"),
      fileUrl: z
        .string()
        .optional()
        .describe("Vercel Blob URL of a file to load into the sandbox"),
      fileName: z
        .string()
        .optional()
        .describe("Filename to use inside the sandbox (e.g. sales.xlsx)"),
    }),
    execute: async ({ code, fileUrl, fileName }): Promise<E2BExecutionResult> => {
      const sandboxId = await getOrCreateSession(threadId);
      const sandbox = await Sandbox.connect(sandboxId, {
        apiKey: process.env.E2B_API_KEY!,
      });

      if (fileUrl && fileName) {
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();
        await sandbox.files.write(`/home/user/${fileName}`, new Uint8Array(buffer));
      }

      const execution = await sandbox.notebook.execCell(code);

      await refreshSession(threadId, sandbox.sandboxId);

      const stdout = execution.logs.stdout.join("");
      const stderr = execution.logs.stderr.join("");
      const images = execution.results
        .filter((r) => r.png)
        .map((r) => ({ base64: r.png!, format: "png" }));

      return { stdout, stderr, images, sessionId: sandbox.sandboxId };
    },
  });
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm vitest run src/lib/ai/tools/code/execute-python-server.test.ts 2>&1 | tail -10
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/tools/index.ts src/lib/ai/tools/code/execute-python-server.ts src/lib/ai/tools/code/execute-python-server.test.ts
git commit -m "feat: add execute_python server tool backed by E2B"
```

---

## Task 5: Register Tool in Chat Route + System Prompt

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/ai/prompts.ts`

- [ ] **Step 1: Import the tool factory in the chat route**

In `src/app/api/chat/route.ts`, add this import after the existing tool imports (around line 50):
```typescript
import { createExecutePythonTool } from "lib/ai/tools/code/execute-python-server";
```

- [ ] **Step 2: Register the tool in the chat route**

In `src/app/api/chat/route.ts`, find the section where `vercelAITooles` is assembled (around line 295–330). Add the `execute_python` tool alongside the existing tools. Find the `tools: vercelAITooles` line and the construction just above it, and add:

```typescript
// Add just before the `tools: vercelAITooles` line in the streamText call:
const EXECUTE_PYTHON_TOOL = isToolCallAllowed
  ? { execute_python: createExecutePythonTool(thread!.id) }
  : {};
```

Then in the `tools:` spread, add `...EXECUTE_PYTHON_TOOL`:
```typescript
tools: { ...EXECUTE_PYTHON_TOOL, ...vercelAITooles },
```

- [ ] **Step 3: Add system prompt instructions**

In `src/lib/ai/prompts.ts`, inside `buildUserSystemPrompt`, append this block before the final `return prompt` statement. Find the `<general_capabilities>` section and add after it:

```typescript
  prompt += `

<data_analysis_capabilities>
You have access to an \`execute_python\` tool that runs Python in a persistent server-side sandbox (E2B).
- Use it whenever the user uploads a file (Excel, CSV) or asks for data analysis, calculations, or charts.
- The sandbox has pandas, openpyxl, matplotlib, seaborn, numpy, and scipy pre-installed.
- When a file is attached, pass its URL as \`fileUrl\` and its filename as \`fileName\`. The file will be at \`/home/user/{fileName}\` in the sandbox.
- Variables, imports, and loaded DataFrames persist across all messages in this conversation.
- For charts, use matplotlib — images are automatically captured and displayed.
Example: df = pd.read_excel('/home/user/sales.xlsx', sheet_name='Q1')
</data_analysis_capabilities>`;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/ai/prompts.ts
git commit -m "feat: register execute_python tool in chat route with system prompt"
```

---

## Task 6: Excel File Support

**Files:**
- Create: `src/lib/file-ingest/excel.ts`
- Create: `src/lib/file-ingest/excel.test.ts`
- Modify: `src/lib/ai/file-support.ts`
- Modify: `src/app/api/storage/ingest/route.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/file-ingest/excel.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseExcelPreview, formatExcelPreviewText } from "./excel";
import * as XLSX from "xlsx";

function makeExcelBuffer(sheets: Record<string, string[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

describe("parseExcelPreview", () => {
  it("returns sheet names, column headers, and row count", () => {
    const buf = makeExcelBuffer({
      Q1_Sales: [
        ["Date", "Region", "Revenue"],
        ["2025-01-01", "North", 1000],
        ["2025-01-02", "South", 2000],
      ],
      Summary: [["Total"], [3000]],
    });

    const preview = parseExcelPreview(buf);

    expect(preview.sheetNames).toEqual(["Q1_Sales", "Summary"]);
    expect(preview.sheets[0].name).toBe("Q1_Sales");
    expect(preview.sheets[0].columns).toEqual(["Date", "Region", "Revenue"]);
    expect(preview.sheets[0].rowCount).toBe(2);
  });
});

describe("formatExcelPreviewText", () => {
  it("formats preview as readable text for chat context", () => {
    const buf = makeExcelBuffer({
      Sales: [["Date", "Amount"], ["2025-01-01", 100]],
    });
    const preview = parseExcelPreview(buf);
    const text = formatExcelPreviewText("sales.xlsx", preview);

    expect(text).toContain("sales.xlsx");
    expect(text).toContain("Sales");
    expect(text).toContain("Date");
    expect(text).toContain("Amount");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm vitest run src/lib/file-ingest/excel.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the Excel parser**

Create `src/lib/file-ingest/excel.ts`:
```typescript
import * as XLSX from "xlsx";

export interface ExcelSheetPreview {
  name: string;
  columns: string[];
  rowCount: number;
}

export interface ExcelPreview {
  sheetNames: string[];
  sheets: ExcelSheetPreview[];
  totalSheets: number;
}

export function parseExcelPreview(content: Buffer): ExcelPreview {
  const workbook = XLSX.read(content, { type: "buffer" });
  const sheetNames = workbook.SheetNames;

  const sheets: ExcelSheetPreview[] = sheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    const header = (rows[0] as string[]) ?? [];
    const columns = header.map(String).filter(Boolean);
    const rowCount = Math.max(0, rows.length - 1);
    return { name, columns, rowCount };
  });

  return { sheetNames, sheets, totalSheets: sheetNames.length };
}

export function formatExcelPreviewText(
  name: string,
  preview: ExcelPreview,
): string {
  const lines: string[] = [
    `Excel file: ${name} — ${preview.totalSheets} sheet(s)`,
  ];
  for (const sheet of preview.sheets) {
    lines.push(
      `  Sheet "${sheet.name}": ${sheet.rowCount} rows, columns: ${sheet.columns.join(", ")}`,
    );
  }
  lines.push(
    `\nTo analyze this file, use the execute_python tool with fileUrl and fileName parameters.`,
  );
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run src/lib/file-ingest/excel.test.ts 2>&1 | tail -10
```

Expected: 2 tests PASS.

- [ ] **Step 5: Enable XLSX MIME types**

In `src/lib/ai/file-support.ts`, replace the `INGEST_SUPPORTED_MIME` definition:
```typescript
export const INGEST_SUPPORTED_MIME = new Set<string>([
  "text/csv",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
]);
```

- [ ] **Step 6: Update the ingest route to handle Excel**

In `src/app/api/storage/ingest/route.ts`, replace the full file contents with:
```typescript
import { NextResponse } from "next/server";
import { serverFileStorage } from "lib/file-storage";
import { parseCsvPreview, formatCsvPreviewText } from "lib/file-ingest/csv";
import { parseExcelPreview, formatExcelPreviewText } from "lib/file-ingest/excel";
import { storageKeyFromUrl } from "lib/file-storage/storage-utils";

type Body = {
  key?: string;
  url?: string;
  type?: "csv" | "excel" | "auto";
  maxRows?: number;
  maxCols?: number;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = body.key || (body.url ? storageKeyFromUrl(body.url) : undefined);
  if (!key) {
    return NextResponse.json({ error: "Missing 'key' or 'url'" }, { status: 400 });
  }

  const type = body.type || "auto";
  const isExcel =
    type === "excel" ||
    /\.(xlsx|xls)$/i.test(key) ||
    /(^|[?&])contentType=application\/vnd/i.test(body.url || "");
  const isCsv =
    !isExcel &&
    (type === "csv" ||
      /\.(csv)$/i.test(key) ||
      /(^|[?&])contentType=text\/csv(&|$)/i.test(body.url || "") ||
      /(^|[?&])content-type=text\/csv(&|$)/i.test(body.url || ""));

  if (!isExcel && !isCsv) {
    return NextResponse.json(
      { error: "Unsupported file type for ingest", solution: "Supported: CSV, XLSX, XLS" },
      { status: 400 },
    );
  }

  const buf = await serverFileStorage.download(key);

  if (isExcel) {
    const preview = parseExcelPreview(buf);
    const text = formatExcelPreviewText(body.key || key, preview);
    return NextResponse.json({ ok: true, type: "excel", key, preview, text });
  }

  const preview = parseCsvPreview(buf, {
    maxRows: Math.min(200, Math.max(1, body.maxRows ?? 50)),
    maxCols: Math.min(40, Math.max(1, body.maxCols ?? 12)),
  });
  const text = formatCsvPreviewText(key, preview);
  return NextResponse.json({ ok: true, type: "csv", key, preview, text });
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/file-ingest/excel.ts src/lib/file-ingest/excel.test.ts src/lib/ai/file-support.ts src/app/api/storage/ingest/route.ts
git commit -m "feat: add Excel file ingest support (xlsx/xls preview)"
```

---

## Task 7: Excel Ingest Preview in Chat Context

**Files:**
- Create: `src/lib/ai/ingest/excel-ingest.ts`
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Create the Excel ingest helper**

Create `src/lib/ai/ingest/excel-ingest.ts`:
```typescript
import { Buffer } from "node:buffer";
import { ChatAttachment } from "app-types/chat";
import { storageKeyFromUrl } from "@/lib/file-storage/storage-utils";
import { parseExcelPreview, formatExcelPreviewText } from "@/lib/file-ingest/excel";

type ExcelPreviewPart = {
  type: "text";
  text: string;
  ingestionPreview: true;
};

export type DownloadFile = (key: string) => Promise<Buffer>;

const isExcelAttachment = (attachment: ChatAttachment, key: string) => {
  const mediaType = attachment.mediaType || "";
  if (
    mediaType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mediaType === "application/vnd.ms-excel"
  ) {
    return true;
  }
  const name = (attachment.filename || key || "").toLowerCase();
  return /\.(xlsx|xls)$/.test(name);
};

export const buildExcelIngestionPreviewParts = async (
  attachments: ChatAttachment[],
  download: DownloadFile,
): Promise<ExcelPreviewPart[]> => {
  if (!attachments?.length) return [];

  const results = await Promise.all(
    attachments.map(async (attachment) => {
      if (attachment.type !== "source-url") return null;
      const key = storageKeyFromUrl(attachment.url);
      if (!key) return null;
      if (!isExcelAttachment(attachment, key)) return null;

      try {
        const buffer = await download(key);
        const preview = parseExcelPreview(buffer);
        const text = formatExcelPreviewText(attachment.filename || key, preview);
        return { type: "text" as const, text, ingestionPreview: true as const };
      } catch {
        return null;
      }
    }),
  );

  return results.filter(Boolean) as ExcelPreviewPart[];
};
```

- [ ] **Step 2: Import and wire into the chat route**

In `src/app/api/chat/route.ts`, add the import after the CSV ingest import (around line 52):
```typescript
import { buildExcelIngestionPreviewParts } from "@/lib/ai/ingest/excel-ingest";
```

Then find the block where `ingestionPreviewParts` is used (around line 110–129) and add Excel preview in parallel:
```typescript
    const [ingestionPreviewParts, excelIngestionPreviewParts] = await Promise.all([
      buildCsvIngestionPreviewParts(attachments, (key) => serverFileStorage.download(key)),
      buildExcelIngestionPreviewParts(attachments, (key) => serverFileStorage.download(key)),
    ]);
    const allIngestionParts = [...ingestionPreviewParts, ...excelIngestionPreviewParts];

    if (allIngestionParts.length) {
      const baseParts = [...message.parts];
      let insertionIndex = -1;
      for (let i = baseParts.length - 1; i >= 0; i -= 1) {
        if (baseParts[i]?.type === "text") {
          insertionIndex = i;
          break;
        }
      }
      if (insertionIndex !== -1) {
        baseParts.splice(insertionIndex, 0, ...allIngestionParts);
        message.parts = baseParts;
      } else {
        message.parts = [...baseParts, ...allIngestionParts];
      }
    }
```

(Replace the old `if (ingestionPreviewParts.length)` block entirely with the above.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/ingest/excel-ingest.ts src/app/api/chat/route.ts
git commit -m "feat: inject Excel file preview into chat context"
```

---

## Task 8: Zustand Store — activeArtifact State

**Files:**
- Modify: `src/app/store/index.ts`

- [ ] **Step 1: Add ArtifactData import and activeArtifact to AppState**

In `src/app/store/index.ts`, add the import at the top:
```typescript
import type { ArtifactData } from "lib/e2b/types";
```

In the `AppState` interface, add after `pendingThreadMention`:
```typescript
  activeArtifact: ArtifactData | null;
```

- [ ] **Step 2: Add activeArtifact to initialState**

In the `initialState` object, add:
```typescript
  activeArtifact: null,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/store/index.ts
git commit -m "feat: add activeArtifact to app store"
```

---

## Task 9: ArtifactsPanel Component

**Files:**
- Create: `src/components/artifacts-panel.tsx`

- [ ] **Step 1: Create the ArtifactsPanel component**

Create `src/components/artifacts-panel.tsx`:
```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart2, Code2, Copy, Check } from "lucide-react";
import { Button } from "ui/button";
import { appStore } from "@/app/store";
import { useCopy } from "@/hooks/use-copy";
import type { ArtifactData } from "lib/e2b/types";

function CodeTab({ code }: { code: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="relative flex-1 overflow-auto">
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 z-10 h-7 w-7"
        onClick={() => copy(code)}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
      <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function PreviewTab({ artifact }: { artifact: ArtifactData }) {
  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {artifact.stdout && (
        <pre className="text-xs font-mono bg-muted rounded-md p-3 whitespace-pre-wrap break-words text-foreground leading-relaxed">
          {artifact.stdout}
        </pre>
      )}
      {artifact.images.map((img, i) => (
        <img
          key={i}
          src={`data:image/${img.format};base64,${img.base64}`}
          alt={`chart-${i}`}
          className="w-full rounded-md border border-border"
        />
      ))}
      {artifact.stderr && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-xs font-mono text-amber-600 dark:text-amber-400 whitespace-pre-wrap break-words">
            {artifact.stderr}
          </p>
        </div>
      )}
    </div>
  );
}

export function ArtifactsPanel() {
  const activeArtifact = appStore((s) => s.activeArtifact);
  const mutate = appStore((s) => s.mutate);
  const [tab, setTab] = useState<"preview" | "code">("preview");

  return (
    <AnimatePresence>
      {activeArtifact && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 450, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="shrink-0 h-full flex flex-col bg-background border-l border-border shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <BarChart2 className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">{activeArtifact.title}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => mutate({ activeArtifact: null })}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-4">
            {(["preview", "code"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2 px-3 text-sm capitalize border-b-2 transition-colors ${
                  tab === t
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "code" ? (
                  <span className="flex items-center gap-1.5">
                    <Code2 className="size-3.5" /> Code
                  </span>
                ) : (
                  "Preview"
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {tab === "preview" ? (
              <PreviewTab artifact={activeArtifact} />
            ) : (
              <CodeTab code={activeArtifact.code} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/artifacts-panel.tsx
git commit -m "feat: add ArtifactsPanel sliding sidebar component"
```

---

## Task 10: execute_python Tool Invocation Card + Message Dispatch

**Files:**
- Create: `src/components/tool-invocation/execute-python.tsx`
- Modify: `src/components/message-parts.tsx`

- [ ] **Step 1: Create the in-chat tool invocation card**

Create `src/components/tool-invocation/execute-python.tsx`:
```tsx
"use client";

import { ToolUIPart } from "ai";
import { BarChart2, Loader } from "lucide-react";
import { Button } from "ui/button";
import { appStore } from "@/app/store";
import type { E2BExecutionResult } from "lib/e2b/types";
import { generateUUID } from "lib/utils";

interface ExecutePythonInvocationProps {
  part: ToolUIPart;
}

export function ExecutePythonInvocation({ part }: ExecutePythonInvocationProps) {
  const mutate = appStore((s) => s.mutate);

  const isRunning = part.state === "input-available" || part.state === "output-streaming";
  const isComplete = part.state === "output-available";

  const result = isComplete ? (part.output as E2BExecutionResult) : null;
  const input = part.input as { code?: string; fileName?: string } | undefined;

  const handleViewResults = () => {
    if (!result || !input?.code) return;
    mutate({
      activeArtifact: {
        id: part.toolCallId ?? generateUUID(),
        code: input.code,
        stdout: result.stdout,
        stderr: result.stderr,
        images: result.images,
        title: input.fileName ? `${input.fileName} analysis` : "Python analysis",
        sessionId: result.sessionId,
      },
    });
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm my-1">
      <div className="flex items-center gap-2.5">
        {isRunning ? (
          <Loader className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <BarChart2 className="size-4 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium leading-tight">
            {isRunning ? "Running analysis..." : "Data Analysis Complete"}
          </p>
          {input?.fileName && (
            <p className="text-xs text-muted-foreground mt-0.5">{input.fileName}</p>
          )}
        </div>
      </div>
      {isComplete && (
        <Button size="sm" variant="outline" onClick={handleViewResults} className="h-7 text-xs">
          View Results
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the dispatch case in message-parts.tsx**

In `src/components/message-parts.tsx`, add the import after the existing tool invocation imports (around line 61):
```typescript
import { ExecutePythonInvocation } from "./tool-invocation/execute-python";
```

Then inside the `CustomToolComponent` useMemo block (around line 894), add a new case before the `if (state === "output-available")` block:
```typescript
      if (toolName === DefaultToolName.ExecutePython) {
        return <ExecutePythonInvocation part={part} />;
      }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tool-invocation/execute-python.tsx src/components/message-parts.tsx
git commit -m "feat: add execute_python tool invocation card with View Results button"
```

---

## Task 11: Chat Layout — Mount ArtifactsPanel

**Files:**
- Modify: `src/components/chat-bot.tsx`

- [ ] **Step 1: Import ArtifactsPanel**

In `src/components/chat-bot.tsx`, add the import near the top with other component imports:
```typescript
import { ArtifactsPanel } from "./artifacts-panel";
```

- [ ] **Step 2: Wrap the layout in flex-row and mount the panel**

In `src/components/chat-bot.tsx`, find the outer return block starting at the fragment (around line 407):
```tsx
  return (
    <>
      {particle}
      <div
        className={cn(
          emptyMessage && "justify-center pb-24",
          "flex flex-col min-w-0 relative h-full z-40",
        )}
      >
```

Change it to:
```tsx
  return (
    <>
      {particle}
      <div className="flex flex-row min-w-0 h-full flex-1 overflow-hidden">
        <div
          className={cn(
            emptyMessage && "justify-center pb-24",
            "flex flex-col min-w-0 flex-1 relative h-full z-40",
          )}
        >
```

Then find the closing `</div>` of that outer div (just before the final `</>`) and add the panel + extra closing tag:
```tsx
        </div>
        <ArtifactsPanel />
      </div>
    </>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat-bot.tsx
git commit -m "feat: mount ArtifactsPanel in chat layout (flex-row)"
```

---

## Task 12: Smoke Test

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test 2>&1 | tail -20
```

Expected: all existing tests pass + new tests pass.

- [ ] **Step 2: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 3: Manual smoke test — Python execution**

1. Open the chat
2. Send the message: `Use execute_python to print "Hello from E2B" and show a simple matplotlib bar chart`
3. Expected: tool invocation card appears in chat, "Data Analysis Complete" shown
4. Click "View Results" — ArtifactsPanel slides in from the right
5. Preview tab shows stdout text and the chart image
6. Code tab shows the Python code with a copy button
7. Send follow-up: `Now double all the values` — verify the sandbox remembers the previous state

- [ ] **Step 4: Manual smoke test — Excel file**

1. Upload an `.xlsx` file to the chat
2. Expected: chat context receives sheet names + column headers before the AI responds
3. AI should automatically call `execute_python` with the file URL and filename
4. "View Results" card appears, panel shows the analysis

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Python interpreter & Excel analysis with E2B

Stateful Python execution via E2B Code Interpreter, Excel/CSV file
analysis, and claude.ai-style Artifacts side panel.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
