# Feature List & Task Tracker

> **Context handoff doc** — reference this at the start of every new session.  
> Updated: 2026-04-02 | Branch: `claude/platform-architecture-planning-h1crR`

---

## How to use this doc

- ✅ = Done and deployed  
- 🔄 = In progress  
- ⬜ = Not started  
- ❌ = Decided not to build (with reason)

When starting a new session, tell Claude: _"Read docs/feature_list.md and continue from where we left off."_

---

## Baseline: What We Have (Parity with Claude.ai)

| Feature | Status | Notes |
|---------|--------|-------|
| Stateful Python execution (E2B) | ✅ | Per-thread, Redis-backed, 35-min TTL |
| Excel file upload + schema preview | ✅ | SheetJS, injects sheet names/columns/URL into chat |
| CSV file upload + preview | ✅ | Full preview + Blob URL in chat context |
| PNG chart output in Artifacts panel | ✅ | Base64 images from matplotlib/seaborn |
| Artifacts side panel (sliding) | ✅ | Framer Motion, Preview + Code tabs |
| Mermaid diagrams in chat | ✅ | `mermaid` npm package, theme-aware |
| Code syntax highlighting | ✅ | In chat messages |
| Tool invocation card ("Data Analysis Complete") | ✅ | "View Results →" button |
| Context overflow fix | ✅ | Images stripped from history before sending to model |
| fileUrl injected into preview text | ✅ | AI gets exact Blob URL to pass to execute_python |

---

## Quick Wins (Done 2026-04-02)

| # | Feature | Status | Files Changed |
|---|---------|--------|---------------|
| QW1 | `contentType` field on `ArtifactData` | ✅ | `src/lib/e2b/types.ts` |
| QW2 | SVG rendering in Artifacts panel | ✅ | `src/components/artifacts-panel.tsx` |
| QW3 | Mermaid rendering in Artifacts panel | ✅ | `src/components/artifacts-panel.tsx` |
| QW4 | HTML/React live iframe rendering in panel | ✅ | `src/components/artifacts-panel.tsx` |
| QW5 | `python-pptx`, `python-docx`, `reportlab`, `xlsxwriter`, `Pillow` pre-installed in E2B | ✅ | `src/lib/e2b/session-manager.ts` |
| QW6 | `pip install` support in system prompt | ✅ | `src/lib/ai/prompts.ts` |
| QW7 | `DOWNLOAD_FILE:` marker detection → Vercel Blob → download button | ✅ | `src/lib/ai/tools/code/execute-python-server.ts`, `src/components/artifacts-panel.tsx` |
| QW8 | Download button in Artifacts panel header | ✅ | `src/components/artifacts-panel.tsx` |

---

## Q2 2026 — Close the Core Gap

| # | Feature | Status | Priority | Effort | Files |
|---|---------|--------|----------|--------|-------|
| Q2-1 | **File generation full test** — verify PPTX/DOCX actually generate and download | ⬜ | HIGH | 0.5d | Manual test |
| Q2-2 | **Markdown document artifact type** — classify long docs, render with react-markdown in panel | ⬜ | HIGH | 1d | `artifacts-panel.tsx`, `types.ts` |
| Q2-3 | **Interactive charts** — update system prompt to offer Chart.js/Plotly HTML artifacts for interactive viz | ⬜ | HIGH | 0.5d | `prompts.ts` |
| Q2-4 | **artifactType detection in tool card** — show different icon for HTML/React/PPTX artifacts | ⬜ | Medium | 0.5d | `tool-invocation/execute-python.tsx` |
| Q2-5 | **Multiple file downloads per execution** — handle multiple `DOWNLOAD_FILE:` markers | ⬜ | Medium | 0.5d | `execute-python-server.ts` |

---

## Q3 2026 — Deeper Capabilities

| # | Feature | Status | Priority | Effort | Notes |
|---|---------|--------|----------|--------|-------|
| Q3-1 | **Artifact version history** | ⬜ | Medium | 2d | Store array of artifacts per thread |
| Q3-2 | **Artifact inline editing** | ⬜ | Medium | 2d | Edit code in panel, re-run or re-render |
| Q3-3 | **PDF generation** | ⬜ | Medium | 1d | `reportlab` already installed; test + prompt |
| Q3-4 | **Format conversion** (PDF→PPTX, DOCX→PDF) | ⬜ | Medium | 2d | Via Python in E2B |
| Q3-5 | **Artifact publishing** (shareable URL) | ⬜ | Low | 3d | Store in DB, public `/artifacts/[id]` route |
| Q3-6 | **MCP tools callable from artifacts** | ⬜ | Low | 3d | postMessage bridge |
| Q3-7 | **3D / generative art** (Three.js, p5.js) | ⬜ | Low | 0d | Free once HTML/React rendering works ✅ |

---

## Q4 2026 — Platform Completeness

| # | Feature | Status | Priority | Effort | Notes |
|---|---------|--------|----------|--------|-------|
| Q4-1 | **Artifact persistent storage** (20MB) | ⬜ | Low | 4d | postMessage API + DB |
| Q4-2 | **AI-powered artifacts** (embed model in artifact) | ⬜ | Low | 3d | Proxy API route |
| Q4-3 | **Team artifact sharing** | ⬜ | Low | 3d | Workspace scoping |
| Q4-4 | **Artifact catalog / community gallery** | ⬜ | Low | 5d | Public browse page |

---

## Backlog / Decided Not to Build

| Feature | Decision | Reason |
|---------|----------|--------|
| Artifact remix/fork | ⬜ Backlog | Low value for our use case |
| Games in artifacts | ⬜ Backlog | Fun but not business priority |
| Artifact analytics | ⬜ Backlog | Not needed yet |

---

## Architecture Reference

```
User uploads file
  → Vercel Blob (public URL)
  → Excel/CSV ingest: SheetJS parses metadata + injects {fileUrl, fileName} into chat

AI calls execute_python(code, fileUrl, fileName)
  → session-manager: get/create E2B sandbox (sandboxId cached in Redis by threadId)
  → Sandbox.connect(sandboxId)
  → fetch(fileUrl) → sandbox.files.write(/home/user/fileName)
  → sandbox.runCode(code)
  → stdout + base64 PNGs returned
  → DOWNLOAD_FILE: marker → read file → put() to Vercel Blob → downloadUrl

ArtifactsPanel (right sidebar, Framer Motion)
  → tabs: Preview | Render | Code
  → Preview: stdout terminal + PNG images
  → Render: iframe (HTML/React), SVG inline, Mermaid diagram
  → Code: syntax-highlighted source + copy button
  → Header: download button (if downloadUrl present)

Zustand store: activeArtifact (ephemeral, not persisted)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/e2b/types.ts` | ArtifactData, ArtifactContentType, detectArtifactContentType() |
| `src/lib/e2b/session-manager.ts` | Sandbox lifecycle, package pre-install, Redis cache |
| `src/lib/ai/tools/code/execute-python-server.ts` | Vercel AI SDK v5 tool, file download detection |
| `src/components/artifacts-panel.tsx` | Full panel UI: Preview, Render, Code tabs |
| `src/components/tool-invocation/execute-python.tsx` | In-chat tool card with "View Results" |
| `src/lib/ai/prompts.ts` | System prompt with file generation guidance |
| `src/lib/ai/ingest/excel-ingest.ts` | Excel → chat context with exact fileUrl |
| `src/lib/ai/ingest/csv-ingest.ts` | CSV → chat context with exact fileUrl |
| `src/app/api/chat/route.ts` | Tool registration, image stripping from history |
| `docs/tips-guides/claude-ai-capability-gap-analysis.md` | Full gap analysis vs Claude.ai |

---

## Session Handoff Notes

- **Branch:** `claude/platform-architecture-planning-h1crR` (open PR: cgoinglove/better-chatbot#374)
- **E2B API Key:** in `.env` as `E2B_API_KEY` ✅
- **Dev server:** `pnpm dev` → http://localhost:3000
- **Tests:** `pnpm test`
- **Known issue:** Pre-existing TypeScript errors in `src/app/(sales-hunter)/` and `src/app/api/platform/` — unrelated to this feature, pre-date it
- **E2B sandbox TTL:** 35 min; first message in a new conversation creates the sandbox + installs packages (~10s)
