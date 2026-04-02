# Claude.ai vs Better-Chatbot — Capability Gap Analysis

**Date:** 2026-04-02  
**Purpose:** Identify feature gaps between Claude.ai and our platform, prioritize what to build next.

---

## 1. Executive Summary

Claude.ai has evolved far beyond a chatbot — it is a full creative and analytical workbench with six artifact types, live code execution producing downloadable Office files, interactive React apps rendered in a live sandbox, and a community catalog for sharing. Our platform has a strong foundation: stateful E2B Python execution, an Artifacts side panel, Excel/CSV ingest, and chart rendering. The primary gaps are (1) live HTML/React artifact rendering, (2) file generation and download (PPTX, DOCX, PDF, XLSX), and (3) interactive visualizations. These are all buildable with our existing stack. The sections below map every gap, its complexity, and a recommended build order.

---

## 2. Capability Matrix

| Feature | Claude.ai | Our Platform | Gap | Priority |
|---------|-----------|--------------|-----|----------|
| **Python execution** | ✅ Ubuntu container, Python 3.12 | ✅ E2B sandbox, stateful | Parity | — |
| **Stateful session** | ✅ Per conversation | ✅ Per thread, Redis-backed | Parity | — |
| **Chart output (PNG)** | ✅ | ✅ Base64 in Artifacts panel | Parity | — |
| **Excel file upload + preview** | ✅ | ✅ SheetJS preview + Blob URL | Parity | — |
| **CSV file upload + preview** | ✅ | ✅ | Parity | — |
| **Artifacts side panel** | ✅ | ✅ Sliding panel, Preview + Code tabs | Parity | — |
| **Code syntax highlighting** | ✅ | ✅ | Parity | — |
| **Mermaid diagrams** | ✅ | ✅ In markdown | Parity | — |
| **HTML artifact (live render)** | ✅ iframe sandbox | ❌ | **HIGH** | Q2 |
| **React artifact (live render)** | ✅ Full hooks + state | ❌ | **HIGH** | Q2 |
| **SVG artifact (rendered)** | ✅ | ❌ (shown as code only) | Medium | Q2 |
| **Interactive charts (Plotly/D3/Chart.js)** | ✅ via HTML/React artifacts | ❌ Static PNG only | **HIGH** | Q2 |
| **Excel generation + download (.xlsx)** | ✅ python-openpyxl + download | ❌ No download button | **HIGH** | Q2 |
| **PowerPoint generation + download (.pptx)** | ✅ python-pptx + download | ❌ | **HIGH** | Q2 |
| **Word doc generation + download (.docx)** | ✅ python-docx + download | ❌ | Medium | Q3 |
| **PDF generation + download (.pdf)** | ✅ reportlab/pdfkit + download | ❌ | Medium | Q3 |
| **File download button in panel** | ✅ | ❌ | **HIGH** | Q2 |
| **Install PyPI packages at runtime** | ✅ | ❌ E2B fixed packages | Medium | Q3 |
| **Artifact version history** | ✅ | ❌ | Low | Q4 |
| **Artifact publish / shareable URL** | ✅ | ❌ | Low | Q4 |
| **Artifact persistent storage (20MB)** | ✅ Pro+ | ❌ | Low | Q4 |
| **Artifact inline editing** | ✅ Click to edit | ❌ | Medium | Q3 |
| **MCP-connected artifacts** | ✅ | ✅ MCP tools exist, not in artifacts | Medium | Q3 |
| **Artifact catalog / community gallery** | ✅ | ❌ | Low | Backlog |
| **Artifact remix (fork)** | ✅ | ❌ | Low | Backlog |
| **3D visualizations (Three.js)** | ✅ via HTML artifact | ❌ | Low | Q3 |
| **Generative art (p5.js, Canvas)** | ✅ via HTML artifact | ❌ | Low | Q3 |
| **Physics simulations** | ✅ via HTML artifact | ❌ | Low | Q3 |
| **Games in artifacts** | ✅ via React/HTML | ❌ | Low | Backlog |
| **Document generation from data** | ✅ Analyze → DOCX/PPTX | ❌ | **HIGH** | Q2 |
| **Format conversion (PDF→PPTX etc.)** | ✅ via code execution | ❌ | Medium | Q3 |
| **AI-powered artifacts (embed Claude API)** | ✅ | ❌ | Low | Q4 |
| **Team artifact sharing** | ✅ Team/Enterprise | ❌ | Low | Q4 |

---

## 3. Feature Area Deep Dives

---

### 3.1 HTML & React Artifact Rendering

#### What Claude.ai does
Every artifact opens in a live sandboxed iframe next to the chat. HTML artifacts (HTML+CSS+JS in one file) run immediately — no build step. React artifacts are transpiled in-browser (Babel standalone + React CDN) and rendered with full hooks, state, and event handlers. Libraries like D3.js, Chart.js, Plotly, Three.js, p5.js load from CDN.

#### What we have
Our `ArtifactsPanel` shows stdout text and base64 PNG images. The Code tab shows syntax-highlighted Python. No live rendering of HTML or React.

#### What's missing
- An `<iframe>` renderer for `text/html` content
- In-browser Babel transpilation for JSX/React artifacts
- Detection logic: when the AI returns HTML or JSX code, classify it as a renderable artifact instead of just code
- A "Render" tab in `ArtifactsPanel` alongside Preview and Code

#### Implementation approach
**File:** `src/components/artifacts-panel.tsx`

Add a third "Render" tab. When the artifact content looks like HTML (`<!DOCTYPE` or `<html`) or JSX (imports React), render it in a sandboxed `<iframe>` using a blob URL:

```typescript
// HTML rendering
const blob = new Blob([artifact.code], { type: "text/html" });
const url = URL.createObjectURL(blob);
<iframe src={url} sandbox="allow-scripts" className="w-full h-full border-0" />

// React rendering — inject Babel + React CDN into the HTML wrapper
const reactHtml = `<!DOCTYPE html>
<html><head>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet">
</head><body><div id="root"></div>
<script type="text/babel">${artifact.code}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script></body></html>`;
```

Also needs: detect artifact type from AI output (add `artifactType: "html" | "react" | "python" | "svg" | "mermaid"` to `ArtifactData` in `src/lib/e2b/types.ts`).

**Complexity:** Medium (2-3 days)  
**Recommendation:** Build Now — this is the single highest-value unlock

---

### 3.2 File Generation & Download

#### What Claude.ai does
Claude's Python sandbox has `python-pptx`, `python-docx`, `reportlab`, `openpyxl` pre-installed. When Python generates a file, a download button appears in the conversation. Users get fully-formatted `.xlsx`, `.pptx`, `.docx`, `.pdf` files.

**Example Excel:** Working formulas, pivot tables, conditional formatting, multiple sheets, embedded charts  
**Example PPTX:** Slide layouts, speaker notes, embedded chart images, custom themes  
**Example DOCX:** Table of contents, headers/footers, professional formatting  
**Example PDF:** Print-ready, proper pagination, reportlab or WeasyPrint

#### What we have
E2B sandbox has `openpyxl` (for reading Excel), `matplotlib`. The `execute_python` tool returns stdout + PNG images. No mechanism to transfer files out of the sandbox or provide a download link.

#### What's missing

**1. Python libraries in E2B sandbox:**
- `python-pptx` — PowerPoint generation
- `python-docx` — Word generation  
- `reportlab` or `weasyprint` — PDF generation
- `Pillow` — image manipulation
- `xlsxwriter` — richer Excel output (charts, formatting)

E2B sandboxes install packages via `pip` at runtime: `sandbox.runCode("import subprocess; subprocess.run(['pip', 'install', 'python-pptx'], capture_output=True)")` — or add a pre-run install step.

**2. File extraction from E2B sandbox:**
E2B v2.4 `sandbox.files.read(path)` returns file bytes. After Python writes a file:
```typescript
const fileBytes = await sandbox.files.read("/home/user/output.pptx");
// Upload to Vercel Blob → return download URL
const blob = await put(`exports/${Date.now()}.pptx`, fileBytes, { access: "public" });
return { ...result, downloadUrl: blob.url, downloadFilename: "analysis.pptx" };
```

**3. Download button in ArtifactsPanel:**
Add `downloadUrl?: string` and `downloadFilename?: string` to `ArtifactData`. Render a download button in the panel header when present.

**4. System prompt update:**
Tell the AI: "When generating files for download, save them to `/home/user/output.{ext}` and print `DOWNLOAD_FILE:/home/user/output.pptx` on a separate line. The system will detect this and provide a download link."

Or: parse `execution.results` for file output markers.

**Complexity:** Medium (3-4 days)  
**Recommendation:** Build Now — highest user value after HTML rendering

---

### 3.3 Interactive Visualizations

#### What Claude.ai does
React artifacts load Chart.js, Plotly, D3.js, Recharts from CDN. Users get fully interactive charts — hover tooltips, zoom, filter, animated transitions. Not static images.

#### What we have
Static base64 PNG from matplotlib. No interactivity.

#### What's missing
Once HTML/React artifact rendering is working (§3.1), interactive charts come for free — the AI just needs to generate Chart.js or Plotly HTML instead of matplotlib PNG. The only addition needed is:

1. Better system prompt guidance: "For interactive charts, generate a React component or HTML file using Chart.js or Plotly loaded from CDN. For static charts or when the user needs an image file, use matplotlib."
2. Artifact type detection to route Chart.js/Plotly output to the Render tab.

**Complexity:** Low (1 day, depends on §3.1 being done)  
**Recommendation:** Build with §3.1

---

### 3.4 SVG Artifact Rendering

#### What Claude.ai does
SVG code renders as a visual vector graphic in the artifact panel. Users see the image, not the markup.

#### What we have
SVG shows as code in the Code tab.

#### What's missing
In `ArtifactsPanel`, detect if `artifact.code` starts with `<svg` and render it directly:
```tsx
<div dangerouslySetInnerHTML={{ __html: artifact.code }} className="w-full h-full" />
```
Or display as an image: `data:image/svg+xml;base64,...`

**Complexity:** Easy (2 hours)  
**Recommendation:** Quick Win — do this immediately

---

### 3.5 Mermaid Diagram Rendering in Artifacts Panel

#### What Claude.ai does
Mermaid code renders as a visual diagram in the artifact panel.

#### What we have
Mermaid renders in markdown chat messages, but if the AI puts Mermaid in an artifact, it shows as code.

#### What's missing
Add Mermaid rendering to `ArtifactsPanel` using `mermaid` npm package (already in the project for chat messages). Detect `graph TD`, `sequenceDiagram`, `gantt`, etc.

**Complexity:** Easy (2 hours)  
**Recommendation:** Quick Win

---

### 3.6 Document Generation (Reports, Essays, Structured Docs)

#### What Claude.ai does
Claude generates well-formatted Markdown documents in the artifact panel. Users can export to DOCX. Long-form content (essays, reports, business plans, technical docs, resumes) lives in the artifact rather than the chat stream.

#### What we have
Long-form text comes as a chat message. No dedicated document artifact type. No export.

#### What's missing
1. **Markdown Document artifact type** — when the AI generates >15 lines of structured Markdown (headers, lists, tables), classify it as a `document` artifact and render it in ArtifactsPanel with a Markdown renderer (already using `react-markdown` in chat).
2. **Export to DOCX** — use `docx` npm package (client-side) or `python-docx` (server-side via execute_python) to convert Markdown → DOCX and trigger download.
3. System prompt instruction: "For reports, essays, structured documents, use a Markdown document artifact."

**Complexity:** Medium (2 days)  
**Recommendation:** Q2

---

### 3.7 Artifact Version History

#### What Claude.ai does
Each iteration of an artifact is saved. A version switcher lets users go back to any previous version.

#### What we have
Only the most recent artifact is in Zustand `activeArtifact`. Previous ones are gone.

#### What's missing
- Store artifact history per thread (array of `ArtifactData[]` keyed by artifact ID or thread ID)
- Version switcher UI in `ArtifactsPanel`
- Persist to localStorage or DB

**Complexity:** Medium (1-2 days)  
**Recommendation:** Q3

---

### 3.8 Artifact Publishing & Sharing

#### What Claude.ai does
One click publishes an artifact to a public URL (`claude.site/artifacts/...`). Shareable with anyone. Counts against the creator's usage. Enterprise: share within team.

#### What we have
Nothing.

#### What's missing
- Store artifact HTML/content in DB or Vercel Blob
- Public route `/artifacts/[id]` that renders the artifact in a full-page iframe
- Share button in ArtifactsPanel
- Optional: access control for team sharing

**Complexity:** Medium (2-3 days)  
**Recommendation:** Q3

---

### 3.9 Artifact Persistent Storage

#### What Claude.ai does
Artifacts can read/write up to 20MB of persistent data (Pro+) using a storage API embedded in the artifact. Enables: journals, habit trackers, collaborative tools, stateful games.

#### What we have
Nothing. Artifacts are ephemeral — closing the conversation loses the artifact.

#### What's missing
- A client-side storage API exposed to artifact iframes (via `postMessage`)
- Backend: artifact storage record in DB (user → artifact → JSON blob)
- API route: `GET/PUT /api/artifacts/[id]/storage`

**Complexity:** Hard (3-4 days)  
**Recommendation:** Q4

---

### 3.10 PyPI Package Installation

#### What Claude.ai does
Claude can `pip install` any approved package during code execution. This means `statsmodels`, `scikit-learn`, `geopandas`, `networkx`, `plotly`, `python-pptx`, etc. are all available.

#### What we have
E2B sandbox has a fixed set. Installing packages at runtime is possible (`sandbox.runCode("!pip install ...")`) but not guided or cached.

#### What's missing
- Allow `!pip install` via the system prompt: "You may install packages with `!pip install package-name` if a needed library isn't available."
- Pre-warm common packages by running an install script on first sandbox creation
- Cache: after install, `refreshSession` keeps the sandbox alive (already implemented)

**Complexity:** Easy (1 day — just system prompt + test)  
**Recommendation:** Quick Win

---

## 4. Recommended Build Roadmap

### Q2 2026 (Next 3 months) — Close the Core Gap

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | **HTML/React artifact live rendering** in ArtifactsPanel | 3 days | 🔥 Very High |
| 2 | **File download** — extract files from E2B, upload to Blob, download button | 3 days | 🔥 Very High |
| 3 | **python-pptx + python-docx in E2B** — PowerPoint & Word generation | 1 day | 🔥 Very High |
| 4 | **SVG rendering** in ArtifactsPanel | 2 hours | High |
| 5 | **Mermaid rendering** in ArtifactsPanel | 2 hours | High |
| 6 | **PyPI install support** (system prompt + E2B) | 1 day | High |
| 7 | **Markdown document artifact type** — classify long docs, render in panel | 2 days | High |
| 8 | **Interactive charts** — once HTML rendering works, update system prompt | 1 day | High |

---

### Q3 2026 — Deeper Capabilities

| # | Feature | Effort |
|---|---------|--------|
| 9 | **Artifact version history** | 2 days |
| 10 | **Artifact inline editing** (edit code directly in panel, re-render) | 2 days |
| 11 | **PDF generation** via reportlab/WeasyPrint in E2B | 2 days |
| 12 | **Format conversion** (PDF → PPTX, DOCX → PDF) | 2 days |
| 13 | **3D / generative art artifacts** (Three.js, p5.js via HTML renderer) | 0 days — free after §1 |
| 14 | **Artifact publishing** (shareable URL) | 3 days |
| 15 | **MCP tools in artifacts** (artifacts call external APIs) | 3 days |

---

### Q4 2026 — Platform Completeness

| # | Feature | Effort |
|---|---------|--------|
| 16 | **Artifact persistent storage** | 4 days |
| 17 | **AI-powered artifacts** (embed model API in artifact) | 3 days |
| 18 | **Team artifact sharing** | 3 days |
| 19 | **Artifact catalog** (community gallery) | 5 days |

---

### Backlog (Nice to Have)

- Artifact remix / fork
- Games in artifacts
- Artifact analytics (view count)
- Mobile artifact viewer

---

## 5. Quick Wins (< 1 day each)

These can be done immediately with minimal risk:

| Quick Win | What to do | File |
|-----------|-----------|------|
| **SVG rendering** | Detect `<svg` in artifact.code, render with `dangerouslySetInnerHTML` | `src/components/artifacts-panel.tsx` |
| **Mermaid in panel** | Use `mermaid.render()` when artifact type is mermaid | `src/components/artifacts-panel.tsx` |
| **PyPI installs** | Update system prompt: "Use `!pip install pkg` for missing packages" | `src/lib/ai/prompts.ts` |
| **python-pptx/docx install** | Add `await sandbox.runCode("!pip install python-pptx python-docx reportlab")` to session creation | `src/lib/e2b/session-manager.ts` |
| **Artifact content type detection** | Add `type` field to `ArtifactData` — detect html/react/svg/mermaid/python | `src/lib/e2b/types.ts` |
| **Copy button on Preview tab** | Add copy button for stdout text (already have one on Code tab) | `src/components/artifacts-panel.tsx` |

---

## 6. Technical Architecture for HTML/React Rendering

This is the most impactful change. Here's the concrete implementation plan:

### ArtifactData type extension (`src/lib/e2b/types.ts`)
```typescript
export type ArtifactContentType = "python" | "html" | "react" | "svg" | "mermaid" | "markdown";

export interface ArtifactData {
  id: string;
  code: string;
  contentType: ArtifactContentType;  // NEW
  stdout: string;
  stderr?: string;
  images: E2BExecutionImage[];
  downloadUrl?: string;             // NEW — for file downloads
  downloadFilename?: string;        // NEW
  title: string;
  sessionId: string;
}
```

### Content type detection (`src/lib/ai/tools/code/detect-artifact-type.ts`)
```typescript
export function detectArtifactType(code: string): ArtifactContentType {
  const trimmed = code.trim();
  if (trimmed.startsWith("<svg")) return "svg";
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) return "html";
  if (/^(graph |sequenceDiagram|gantt|erDiagram|flowchart )/m.test(trimmed)) return "mermaid";
  if (/import React|from ['"]react['"]|export default function/.test(trimmed)) return "react";
  if (/^#{1,6} |\*\*|^- |\|.*\|/m.test(trimmed) && trimmed.length > 500) return "markdown";
  return "python";
}
```

### ArtifactsPanel Render tab
```typescript
// In artifacts-panel.tsx — add "Render" tab
{contentType === "html" && (
  <iframe
    srcDoc={artifact.code}
    sandbox="allow-scripts allow-same-origin"
    className="w-full h-full border-0"
  />
)}
{contentType === "react" && (
  <iframe
    srcDoc={wrapReactForIframe(artifact.code)}  // inject Babel + React + Tailwind CDN
    sandbox="allow-scripts"
    className="w-full h-full border-0"
  />
)}
{contentType === "svg" && (
  <div className="p-4" dangerouslySetInnerHTML={{ __html: artifact.code }} />
)}
```

### File download flow (`src/lib/ai/tools/code/execute-python-server.ts`)
```typescript
// After runCode, scan for files to download
const filesToDownload = execution.logs.stdout
  .join("")
  .match(/DOWNLOAD_FILE:([^\n]+)/g)
  ?.map(m => m.replace("DOWNLOAD_FILE:", "").trim());

if (filesToDownload?.length) {
  const fileBytes = await sandbox.files.read(filesToDownload[0]);
  const { url } = await put(`exports/${Date.now()}-${path.basename(filesToDownload[0])}`,
    Buffer.from(fileBytes), { access: "public" });
  return { ...result, downloadUrl: url, downloadFilename: path.basename(filesToDownload[0]) };
}
```

---

## 7. Sources

- [Claude Artifacts official docs](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
- [Claude file creation announcement](https://claude.com/blog/create-files)
- [Claude code execution tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)
- [Claude file creation help article](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude)
- [Claude Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Awesome Claude Skills (travisvn)](https://github.com/travisvn/awesome-claude-skills)
- [Claude artifacts guide 2026 (albato)](https://albato.com/blog/publications/how-to-use-claude-artifacts-guide)
- [Claude artifacts full capability (creatoreconomy)](https://creatoreconomy.so/p/claude-everything-you-can-build-with)
- [Simon Willison: Claude Code Interpreter review](https://simonwillison.net/2025/Sep/9/claude-code-interpreter/)
- [Claude PowerPoint skill guide](https://smartscope.blog/en/generative-ai/claude/claude-pptx-skill-practical-guide/)
