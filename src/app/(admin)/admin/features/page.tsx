"use client";

const STATUS = {
  done: {
    label: "✅ Done",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  inProgress: {
    label: "🔄 In Progress",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  planned: { label: "⬜ Planned", className: "bg-muted text-muted-foreground" },
  skipped: { label: "❌ Skipped", className: "bg-red-500/10 text-red-500" },
} as const;

type StatusKey = keyof typeof STATUS;

interface Feature {
  name: string;
  status: StatusKey;
  priority?: "HIGH" | "Medium" | "Low";
  effort?: string;
  notes?: string;
  claudeHas?: boolean;
}

interface Section {
  title: string;
  description?: string;
  features: Feature[];
}

const sections: Section[] = [
  {
    title: "Baseline — Parity with Claude.ai",
    description: "Core features already implemented",
    features: [
      {
        name: "Stateful Python execution (E2B)",
        status: "done",
        claudeHas: true,
        notes: "Per-thread, Redis-backed, 35-min TTL",
      },
      {
        name: "Excel file upload + schema preview",
        status: "done",
        claudeHas: true,
        notes: "SheetJS, injects columns/rows/URL into chat",
      },
      {
        name: "CSV file upload + preview",
        status: "done",
        claudeHas: true,
        notes: "Full preview with Blob URL in context",
      },
      {
        name: "PNG chart output (matplotlib/seaborn)",
        status: "done",
        claudeHas: true,
        notes: "Base64 images in Artifacts panel",
      },
      {
        name: "Artifacts side panel",
        status: "done",
        claudeHas: true,
        notes: "Sliding panel, Preview + Code tabs",
      },
      {
        name: "Mermaid diagrams in chat",
        status: "done",
        claudeHas: true,
        notes: "Theme-aware rendering",
      },
      {
        name: "Tool invocation card",
        status: "done",
        claudeHas: true,
        notes: '"Data Analysis Complete" + View Results button',
      },
      {
        name: "Context overflow protection",
        status: "done",
        claudeHas: true,
        notes: "Images stripped from history before model call",
      },
    ],
  },
  {
    title: "Quick Wins — Completed 2026-04-02",
    description: "All shipped in one session",
    features: [
      {
        name: "ArtifactContentType detection (SVG, HTML, React, Mermaid, Markdown)",
        status: "done",
        claudeHas: true,
        effort: "2h",
      },
      {
        name: "SVG artifact live rendering in panel",
        status: "done",
        claudeHas: true,
        effort: "2h",
      },
      {
        name: "Mermaid artifact rendering in panel",
        status: "done",
        claudeHas: true,
        effort: "2h",
      },
      {
        name: "HTML / React live iframe rendering",
        status: "done",
        claudeHas: true,
        effort: "0.5d",
        notes: "Babel standalone + React CDN in sandboxed iframe",
      },
      {
        name: "python-pptx, python-docx, reportlab, xlsxwriter, Pillow pre-installed",
        status: "done",
        claudeHas: true,
        effort: "1h",
        notes: "Installed on first sandbox creation",
      },
      {
        name: "pip install support in system prompt",
        status: "done",
        claudeHas: true,
        effort: "30m",
      },
      {
        name: "DOWNLOAD_FILE: marker → Blob upload → download button",
        status: "done",
        claudeHas: true,
        effort: "0.5d",
        notes: "Python prints DOWNLOAD_FILE:/path, tool uploads to Vercel Blob",
      },
    ],
  },
  {
    title: "Q2 2026 — Next Up",
    description: "High-value items to build next",
    features: [
      {
        name: "PPTX / DOCX file generation end-to-end test",
        status: "planned",
        priority: "HIGH",
        effort: "0.5d",
        claudeHas: true,
        notes: "Verify python-pptx → DOWNLOAD_FILE → download works",
      },
      {
        name: "Markdown document artifact type",
        status: "planned",
        priority: "HIGH",
        effort: "1d",
        claudeHas: true,
        notes: "Render long reports with react-markdown in panel",
      },
      {
        name: "Interactive charts (Chart.js / Plotly HTML artifacts)",
        status: "planned",
        priority: "HIGH",
        effort: "0.5d",
        claudeHas: true,
        notes: "System prompt update + HTML renderer already done",
      },
      {
        name: "Multiple DOWNLOAD_FILE: markers per execution",
        status: "planned",
        priority: "Medium",
        effort: "0.5d",
        claudeHas: true,
      },
      {
        name: "Artifact type icon in tool card",
        status: "planned",
        priority: "Medium",
        effort: "0.5d",
        claudeHas: false,
        notes: "Show PPTX/DOCX/chart icon depending on output",
      },
    ],
  },
  {
    title: "Q3 2026 — Deeper Capabilities",
    features: [
      {
        name: "Artifact version history",
        status: "planned",
        priority: "Medium",
        effort: "2d",
        claudeHas: true,
      },
      {
        name: "Artifact inline editing",
        status: "planned",
        priority: "Medium",
        effort: "2d",
        claudeHas: true,
        notes: "Edit code in panel, re-run or re-render",
      },
      {
        name: "PDF generation (reportlab)",
        status: "planned",
        priority: "Medium",
        effort: "1d",
        claudeHas: true,
        notes: "Library installed; needs test + prompt",
      },
      {
        name: "Format conversion (PDF→PPTX, DOCX→PDF)",
        status: "planned",
        priority: "Medium",
        effort: "2d",
        claudeHas: true,
      },
      {
        name: "Artifact publishing (shareable URL)",
        status: "planned",
        priority: "Low",
        effort: "3d",
        claudeHas: true,
      },
      {
        name: "3D / generative art (Three.js, p5.js)",
        status: "done",
        priority: "Low",
        claudeHas: true,
        notes: "Free — HTML renderer already supports any CDN library",
      },
    ],
  },
  {
    title: "Q4 2026 — Platform Completeness",
    features: [
      {
        name: "Artifact persistent storage (20MB)",
        status: "planned",
        priority: "Low",
        effort: "4d",
        claudeHas: true,
      },
      {
        name: "AI-powered artifacts (embed model in artifact)",
        status: "planned",
        priority: "Low",
        effort: "3d",
        claudeHas: true,
      },
      {
        name: "Team artifact sharing",
        status: "planned",
        priority: "Low",
        effort: "3d",
        claudeHas: true,
      },
      {
        name: "Artifact catalog / community gallery",
        status: "planned",
        priority: "Low",
        effort: "5d",
        claudeHas: true,
      },
    ],
  },
  {
    title: "Claude.ai Features — Not Building",
    features: [
      {
        name: "Artifact remix / fork",
        status: "skipped",
        claudeHas: true,
        notes: "Low value for our use case",
      },
      {
        name: "Games in artifacts",
        status: "skipped",
        claudeHas: true,
        notes: "Not a business priority",
      },
    ],
  },
];

const priorityColor: Record<string, string> = {
  HIGH: "text-red-500 font-semibold",
  Medium: "text-amber-500",
  Low: "text-muted-foreground",
};

export default function FeaturesPage() {
  const total = sections.flatMap((s) => s.features).length;
  const done = sections
    .flatMap((s) => s.features)
    .filter((f) => f.status === "done").length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Feature Roadmap</h1>
        <p className="text-muted-foreground mt-1">
          Tracking parity with Claude.ai capabilities — {done}/{total} features
          complete ({pct}%)
        </p>
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden w-full max-w-sm">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-lg font-semibold mb-1">{section.title}</h2>
          {section.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {section.description}
            </p>
          )}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-8">
                    Claude.ai
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-32">
                    Status
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-20">
                    Priority
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-16">
                    Effort
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.features.map((f, i) => {
                  const s = STATUS[f.status];
                  return (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-center">
                        {f.claudeHas === false ? "—" : f.claudeHas ? "✓" : ""}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{f.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full ${s.className}`}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-xs ${f.priority ? priorityColor[f.priority] : ""}`}
                      >
                        {f.priority ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {f.effort ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {f.notes ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        Last updated: 2026-04-02 · Branch:
        claude/platform-architecture-planning-h1crR ·{" "}
        <a href="/admin" className="underline hover:text-foreground">
          ← Admin
        </a>
      </p>
    </div>
  );
}
