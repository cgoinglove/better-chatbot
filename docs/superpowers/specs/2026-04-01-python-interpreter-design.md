# Python Interpreter & Excel Analysis — Design Spec
**Date:** 2026-04-01  
**Status:** Approved  
**Goal:** Add a stateful Python execution environment to better-chatbot, enabling claude.ai-style file analysis (Excel, CSV) with an Artifacts side panel for output and charts.

---

## 1. Architecture Overview

Five components working together:

```
User uploads Excel/CSV
        ↓
  Vercel Blob (existing infra, no changes)
        ↓
  Excel ingest preview injected into chat context
  (sheet names, columns, row count)
        ↓
AI calls execute_python tool
        ↓
  E2B Session Manager
  ├── creates sandbox on first call (keyed to conversation ID)
  ├── reuses same sandbox for all follow-up messages
  └── session ID persisted in Redis (keyed: conversation:{id}:e2b-session)
        ↓
  Python runs in E2B sandbox
  (file downloaded from Blob URL into sandbox filesystem)
  pandas · openpyxl · matplotlib · seaborn · numpy · scipy
        ↓
  Results: stdout + base64 PNG charts + stderr
        ↓
  Artifacts Panel slides in from right
  Chat narrows left (flex layout)
```

### Session Lifecycle
- E2B sandbox is **created on the first** `execute_python` call per conversation
- Sandbox ID stored in Redis with 35-minute TTL: `conversation:{id}:e2b-session`
- All subsequent messages in the same conversation **reuse the same sandbox** — variables, loaded DataFrames, and imports persist across messages (stateful, like claude.ai)
- E2B auto-expires sandboxes after 30 min inactivity
- Redis TTL is refreshed on each call to keep active sessions alive

---

## 2. Backend — Tool & Session Manager

### New Files
- `src/lib/e2b/session-manager.ts` — create/retrieve E2B sandboxes via Redis
- `src/lib/e2b/types.ts` — shared TypeScript types

### Modified Files
- `src/app/api/chat/route.ts` — register the `execute_python` tool
- `src/lib/ai/tools/index.ts` — export new tool
- `src/lib/ai/prompts.ts` — add system prompt instructions for the tool

### Tool Schema

```typescript
execute_python({
  code: string,       // Python script to execute
  fileUrl?: string,   // Vercel Blob URL to download into sandbox
  fileName?: string,  // filename to use inside sandbox (e.g. "sales.xlsx")
})
→ {
    stdout: string,
    stderr: string,
    images: { base64: string; format: string }[],
    sessionId: string,
  }
```

### Execution Flow (inside the tool)
1. Look up `conversation:{id}:e2b-session` in Redis
2. If no session → `Sandbox.create()`, store sandbox ID in Redis with 35-min TTL
3. If existing session → `Sandbox.connect(sandboxId)` to resume
4. If `fileUrl` provided → fetch Buffer from Blob URL, `sandbox.files.write(fileName, buffer)`
5. `sandbox.runCode(code)` — captures stdout, stderr, and matplotlib PNG output as base64
6. Refresh Redis TTL on success
7. Return structured result

### System Prompt Addition
A short block added to the existing system prompt:

> You have access to an `execute_python` tool that runs Python in a persistent sandbox. Use it whenever the user uploads a file or asks for data analysis. The sandbox has pandas, openpyxl, matplotlib, seaborn, numpy, and scipy pre-installed. Files are available at `/home/user/{fileName}` after being passed via `fileUrl`. Variables and imports persist across messages in the same conversation.

---

## 3. UI — Artifacts Panel

### New Files
- `src/components/artifacts-panel.tsx` — sliding right sidebar

### Modified Files
- Chat layout component — wrap chat + panel in `flex-row`; panel pushes chat left
- Chat message component — render "View Results" card on completed `execute_python` invocations
- Zustand chat store — add `activeArtifact: ArtifactData | null` + `setActiveArtifact` + `clearArtifact`

### Layout

```
┌─────────────────────────┬──────────────────────────┐
│                         │  [Chart icon] Analysis   │
│   Chat thread           │  ──────────────────── [X]│
│   (flex-1, narrows)     │  [Preview] [Code]         │
│                         │                           │
│                         │  stdout output here       │
│                         │  ┌────────────────────┐  │
│                         │  │   chart image      │  │
│                         │  └────────────────────┘  │
│                         │                           │
│                         │  stderr (amber warning)   │
└─────────────────────────┴──────────────────────────┘
```

### ArtifactsPanel Tabs
- **Preview** — stdout in terminal-styled `<pre>`, base64 charts as `<img>` tags, stderr in amber warning block
- **Code** — raw Python with syntax highlighting + copy-to-clipboard button

### In-Chat Tool Invocation Card
When `execute_python` completes, render a compact card in the message thread:
```
┌─────────────────────────────────────────┐
│ 🐍  Data Analysis Complete              │
│     sales_q1.xlsx · 1,240 rows          │
│                          [View Results →]│
└─────────────────────────────────────────┘
```
Clicking "View Results →" calls `setActiveArtifact(...)` — panel animates in from the right.

### Artifact State Shape

```typescript
interface ArtifactData {
  id: string
  code: string
  stdout: string
  stderr?: string
  images: { base64: string; format: string }[]
  title: string        // e.g. "sales_q1.xlsx analysis"
  sessionId: string
}
```

---

## 4. File Handling & Excel Support

### Modified Files
- `src/lib/ai/file-support.ts` — enable XLSX/XLS MIME types (currently commented out)
- `src/app/api/storage/ingest/route.ts` — add Excel preview handler
- `src/lib/file-ingest/excel.ts` — new file, alongside existing `csv.ts`

### Excel Ingest Preview
When an Excel file is uploaded, a preview is injected into the chat context before the AI responds:

```
📊 sales_2025.xlsx · 3 sheets · 1,240 rows
   Sheets: Q1_Sales, Q2_Sales, Summary
   Columns: Date, Region, Product, Revenue, Units
```

This gives the AI enough schema context to write targeted Python without a discovery pass.

### Implementation
- Use `xlsx` npm package (server-side) for reading sheet names, headers, and row counts
- No full data load at ingest time — just metadata for context
- Full data loaded by Python inside the E2B sandbox when analysis runs

### File Flow End-to-End
```
1. User attaches Excel file in chat
2. Upload → Vercel Blob → returns public URL
3. Ingest → sheet names + column headers inserted into chat context
4. AI writes targeted Python using schema knowledge
5. execute_python tool: fetch file from Blob URL → sandbox.files.write()
6. File available at /home/user/{fileName} in sandbox
7. Python: df = pd.read_excel('/home/user/sales_2025.xlsx', sheet_name='Q1_Sales')
```

### Supported File Formats After This Change
| Format | Status | Handler |
|--------|--------|---------|
| `.xlsx` | New | openpyxl (in E2B) |
| `.xls` | New | xlrd (in E2B) |
| `.csv` | Existing (enhanced) | pandas (in E2B) for large files |
| Images (JPG/PNG/WebP/GIF) | Existing, unchanged | Model file_part |
| PDFs | Existing, unchanged | Model file_part |

---

## 5. Dependencies & Environment

### New npm Package
```bash
pnpm add @e2b/code-interpreter
```

### New Environment Variables
```env
E2B_API_KEY=your_e2b_api_key
```

### Existing Infrastructure Used (no changes needed)
- **Redis** (`ioredis`) — already in stack, used to persist E2B session IDs
- **Vercel Blob** — already in stack, file URLs passed directly to E2B
- **Zustand** — already in stack, extend with `activeArtifact` state
- **Framer Motion** — already in stack, used for panel slide animation
- **Vercel AI SDK v5** — already in stack, `execute_python` registered as a standard tool

### E2B Account Setup
1. Sign up at e2b.dev, get API key
2. Free tier: 100 compute hours/month
3. No infrastructure to provision — fully managed

---

## 6. Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/e2b/session-manager.ts` | Create | E2B sandbox lifecycle, Redis persistence |
| `src/lib/e2b/types.ts` | Create | Shared TypeScript types |
| `src/lib/ai/tools/execute-python.ts` | Create | Vercel AI SDK tool definition |
| `src/components/artifacts-panel.tsx` | Create | Sliding side panel UI |
| `src/components/tool-invocation/execute-python.tsx` | Create | In-chat tool invocation card with "View Results" button |
| `src/lib/file-ingest/excel.ts` | Create | Excel metadata preview parser |
| `src/app/api/chat/route.ts` | Modify | Register execute_python tool |
| `src/lib/ai/tools/index.ts` | Modify | Export new tool |
| `src/lib/ai/prompts.ts` | Modify | Add execute_python system prompt |
| `src/lib/ai/file-support.ts` | Modify | Enable XLSX/XLS MIME types |
| `src/app/api/storage/ingest/route.ts` | Modify | Add Excel ingest handler |
| `src/components/chat-bot.tsx` | Modify | flex-row wrapper, mount ArtifactsPanel |
| `src/components/message-parts.tsx` | Modify | Dispatch to execute-python tool invocation component |
| `src/app/store/index.ts` | Modify | Add activeArtifact state to Zustand store |
