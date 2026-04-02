# Feature Tracker: Python Execution & Artifacts

> **Living document** — update status as features ship. Use this for session handoffs.  
> Last updated: 2026-04-02  
> Reference: [Gap analysis](../tips-guides/claude-ai-capability-gap-analysis.md)

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Shipped & working |
| 🔄 | In progress |
| 📋 | Planned (has spec) |
| 💡 | Idea / backlog |
| ❌ | Won't build |

---

## Phase 1 — Foundation (✅ Complete)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.1 | E2B sandbox — stateful Python per thread | ✅ | `session-manager.ts`, Redis-backed, 35-min TTL |
| 1.2 | `execute_python` tool (Vercel AI SDK v5) | ✅ | `execute-python-server.ts`, factory per threadId |
| 1.3 | PNG chart capture from matplotlib | ✅ | `execution.results` → base64 images |
| 1.4 | Artifacts side panel (sliding) | ✅ | `artifacts-panel.tsx`, Framer Motion |
| 1.5 | Preview tab (stdout + PNG charts) | ✅ | In ArtifactsPanel |
| 1.6 | Code tab (syntax, copy button) | ✅ | In ArtifactsPanel |
| 1.7 | Tool invocation card in chat | ✅ | `execute-python.tsx` |
| 1.8 | Excel file upload → schema preview | ✅ | SheetJS, fileUrl injected into context |
| 1.9 | CSV file upload → data preview | ✅ | `csv-ingest.ts`, fileUrl injected |
| 1.10 | File URL injected so AI can pass to tool | ✅ | Fixed: IMPORTANT block in preview text |
| 1.11 | Context overflow protection (strip images) | ✅ | Strips base64 from old tool results |
| 1.12 | E2B API key guard at registration | ✅ | Skips tool if key absent |

---

## Phase 2 — Quick Wins (✅ Complete — 2026-04-02)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.1 | `contentType` field on `ArtifactData` | ✅ | `types.ts`: python/html/react/svg/mermaid/markdown |
| 2.2 | `detectArtifactContentType()` utility | ✅ | Auto-classifies code in `types.ts` |
| 2.3 | SVG rendering in Artifacts panel | ✅ | RenderTab: `dangerouslySetInnerHTML` |
| 2.4 | Mermaid rendering in Artifacts panel | ✅ | RenderTab: uses `MermaidDiagram` component |
| 2.5 | HTML artifact live rendering (iframe) | ✅ | RenderTab: blob URL → sandboxed iframe |
| 2.6 | React artifact live rendering (iframe) | ✅ | RenderTab: Babel + React CDN wrapper |
| 2.7 | Content-aware tabs (Render vs Preview) | ✅ | python/markdown → Preview; others → Render |
| 2.8 | Content-aware icons on tool card | ✅ | Globe/FileText/GitBranch/AlignLeft/BarChart2 |
| 2.9 | Content-aware labels on tool card | ✅ | "Web app created" / "Report generated" / etc. |
| 2.10 | Markdown report rendering | ✅ | ReactMarkdown in PreviewTab for markdown type |
| 2.11 | `python-pptx` pre-installed in E2B | ✅ | Installed on session creation |
| 2.12 | `python-docx` pre-installed in E2B | ✅ | Installed on session creation |
| 2.13 | `reportlab` pre-installed in E2B | ✅ | Installed on session creation |
| 2.14 | `xlsxwriter` pre-installed in E2B | ✅ | Installed on session creation |
| 2.15 | `Pillow` pre-installed in E2B | ✅ | Installed on session creation |
| 2.16 | PyPI install guidance in system prompt | ✅ | AI can `pip install` missing packages |
| 2.17 | Interactive charts guidance (Chart.js/Plotly) | ✅ | System prompt shows HTML stdout pattern |
| 2.18 | DOWNLOAD_FILE marker detection | ✅ | Parses stdout, extracts file from sandbox |
| 2.19 | File upload to Vercel Blob after generation | ✅ | `put()` in execute-python-server.ts |
| 2.20 | Download button in Artifacts panel header | ✅ | Download icon → `<a download>` link |
| 2.21 | PPTX generation guidance in system prompt | ✅ | python-pptx example in prompt |
| 2.22 | Markdown report guidance in system prompt | ✅ | Print markdown to stdout pattern |

---

## Phase 3 — File Generation (📋 Planned — Q2 2026)

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 3.1 | End-to-end PPTX test (real E2B) | 📋 | High | Manually verify python-pptx works |
| 3.2 | End-to-end DOCX generation | 📋 | High | python-docx → download |
| 3.3 | End-to-end PDF generation | 📋 | High | reportlab → download |
| 3.4 | End-to-end Excel generation (.xlsx) | 📋 | High | xlsxwriter → download |
| 3.5 | Multi-file downloads in one session | 📋 | Medium | Multiple DOWNLOAD_FILE markers |
| 3.6 | File download expiry / cleanup | 📋 | Low | Blob TTL for exported files |

---

## Phase 4 — Interactive Visualizations (📋 Planned — Q2 2026)

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 4.1 | Chart.js interactive charts via HTML artifact | 📋 | High | Needs Phase 2 HTML rendering (✅ done) |
| 4.2 | Plotly interactive charts via HTML artifact | 📋 | High | AI uses `pio.to_html()` pattern |
| 4.3 | D3.js visualizations | 📋 | Medium | CDN-loaded in HTML artifact |
| 4.4 | Three.js 3D graphics | 📋 | Low | CDN-loaded in HTML artifact |
| 4.5 | p5.js generative art / Canvas | 📋 | Low | CDN-loaded in HTML artifact |
| 4.6 | Iframe resize (expand panel width) | 📋 | Medium | Draggable panel width |

---

## Phase 5 — Artifact Enhancements (📋 Planned — Q3 2026)

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 5.1 | Artifact version history | 📋 | Medium | Array of ArtifactData per thread, switcher UI |
| 5.2 | Artifact inline editing | 📋 | Medium | Edit code in panel → re-execute |
| 5.3 | Artifact fullscreen mode | 📋 | Low | Expand to full viewport |
| 5.4 | Artifact copy as image (screenshot) | 📋 | Low | html2canvas on iframe |
| 5.5 | Artifact share / publish URL | 📋 | Low | `/artifacts/[id]` public page |
| 5.6 | Artifact persistent storage | 📋 | Low | postMessage API, DB-backed, 20MB |

---

## Phase 6 — Document Intelligence (📋 Planned — Q3 2026)

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 6.1 | Long-form Markdown document artifacts | 📋 | High | Already detect; needs better formatting |
| 6.2 | PDF upload → full text extraction | 📋 | High | pdfplumber in E2B; needs ingest route |
| 6.3 | DOCX upload → text extraction | 📋 | Medium | python-docx in E2B |
| 6.4 | PDF → PowerPoint conversion | 📋 | Medium | Parse + summarize + format as PPTX |
| 6.5 | Meeting notes → Word doc | 📋 | Medium | python-docx with template |
| 6.6 | Data → financial model (Excel) | 📋 | High | xlsxwriter with formulas, charts |

---

## Phase 7 — Platform Completeness (💡 Backlog — Q4 2026)

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 7.1 | AI-powered artifacts (embed model API) | 💡 | Low | Artifact calls Claude API via MCP |
| 7.2 | Team artifact sharing | 💡 | Low | Multi-tenant access control |
| 7.3 | Artifact catalog / community gallery | 💡 | Low | `/catalog` page, public artifacts |
| 7.4 | Artifact remix (fork from catalog) | 💡 | Low | Copy public artifact to your chat |
| 7.5 | Games in artifacts | 💡 | Low | React artifacts — math games, puzzles |

---

## Claude.ai Parity Scorecard

| Capability Area | Claude.ai | Us | Gap |
|----------------|-----------|-----|-----|
| Python execution | ✅ | ✅ | None |
| Stateful sessions | ✅ | ✅ | None |
| PNG charts | ✅ | ✅ | None |
| Excel/CSV ingest | ✅ | ✅ | None |
| HTML artifacts (live) | ✅ | ✅ | None — Phase 2 done |
| React artifacts (live) | ✅ | ✅ | None — Phase 2 done |
| SVG rendering | ✅ | ✅ | None — Phase 2 done |
| Mermaid diagrams | ✅ | ✅ | None |
| Markdown documents | ✅ | ✅ | None — Phase 2 done |
| Interactive charts | ✅ | ✅ | Needs AI guidance to use pattern |
| PPTX generation | ✅ | 🔄 | Env ready, needs E2E test |
| DOCX generation | ✅ | 🔄 | Env ready, needs E2E test |
| PDF generation | ✅ | 🔄 | Env ready, needs E2E test |
| XLSX generation | ✅ | 🔄 | Env ready, needs E2E test |
| File download | ✅ | ✅ | DOWNLOAD_FILE marker + button |
| Artifact version history | ✅ | ❌ | Phase 5 |
| Artifact publishing | ✅ | ❌ | Phase 5 |
| Artifact persistent storage | ✅ | ❌ | Phase 7 |
| 3D / generative art | ✅ | 🔄 | Works via HTML artifact (CDN) |

---

## Handoff Notes

### Session context to resume from
- Branch: `claude/platform-architecture-planning-h1crR`
- All Phase 1 & 2 features are committed and pushed
- 849 tests passing
- Dev server runs on `pnpm dev` → `localhost:3000`

### Key files for this feature area
| File | Purpose |
|------|---------|
| `src/lib/e2b/types.ts` | ArtifactData, ArtifactContentType, detectArtifactContentType |
| `src/lib/e2b/session-manager.ts` | Sandbox lifecycle, pre-installs packages |
| `src/lib/ai/tools/code/execute-python-server.ts` | Tool execution, DOWNLOAD_FILE detection |
| `src/components/artifacts-panel.tsx` | Side panel: Preview/Render/Code tabs |
| `src/components/tool-invocation/execute-python.tsx` | In-chat tool card |
| `src/lib/ai/prompts.ts` | System prompt: data_analysis_capabilities block |
| `src/lib/ai/ingest/excel-ingest.ts` | Excel → chat context with fileUrl |
| `src/lib/ai/ingest/csv-ingest.ts` | CSV → chat context with fileUrl |

### Next session starting point
1. Run `pnpm dev` — server starts at localhost:3000
2. Test PPTX generation: ask AI to "create a PowerPoint with 3 slides about Q1 results and download it"
3. Test interactive chart: ask AI to "create an interactive Chart.js bar chart showing sales by month"
4. If tests pass, move to Phase 3 (file generation E2E testing)

### Known issues / watch-outs
- E2B `pip install` on session creation adds ~15-20s to first message latency — consider pre-built custom sandbox image
- `@e2b/code-interpreter` and `xlsx` were missing from `package.json` — fixed 2026-04-02
- HTML iframe uses `allow-scripts allow-same-origin` — review security before production
- Vercel Blob `exports/` files have no TTL — add cleanup job before production
