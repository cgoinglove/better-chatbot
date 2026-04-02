"use client";

import { CheckCircle2, Clock, Lightbulb, Zap } from "lucide-react";

type FeatureStatus = "shipped" | "in-progress" | "planned" | "backlog";

interface Feature {
  id: string;
  name: string;
  status: FeatureStatus;
  notes?: string;
  claudeHas?: boolean;
}

interface Phase {
  id: string;
  name: string;
  description: string;
  features: Feature[];
}

const STATUS_CONFIG: Record<
  FeatureStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  shipped: {
    label: "Shipped",
    color: "text-green-600 dark:text-green-400",
    icon: CheckCircle2,
  },
  "in-progress": {
    label: "In Progress",
    color: "text-blue-600 dark:text-blue-400",
    icon: Zap,
  },
  planned: {
    label: "Planned",
    color: "text-yellow-600 dark:text-yellow-400",
    icon: Clock,
  },
  backlog: {
    label: "Backlog",
    color: "text-muted-foreground",
    icon: Lightbulb,
  },
};

const PHASES: Phase[] = [
  {
    id: "phase-1",
    name: "Phase 1 — Foundation",
    description: "Core Python execution pipeline",
    features: [
      {
        id: "1.1",
        name: "E2B stateful Python sandbox",
        status: "shipped",
        claudeHas: true,
        notes: "Per-thread session, Redis-backed, 35-min TTL",
      },
      {
        id: "1.2",
        name: "execute_python AI tool",
        status: "shipped",
        claudeHas: true,
        notes: "Vercel AI SDK v5, factory per threadId",
      },
      {
        id: "1.3",
        name: "PNG chart capture",
        status: "shipped",
        claudeHas: true,
        notes: "matplotlib → base64 images",
      },
      {
        id: "1.4",
        name: "Artifacts side panel",
        status: "shipped",
        claudeHas: true,
        notes: "Framer Motion sliding panel",
      },
      {
        id: "1.5",
        name: "Excel file upload + schema preview",
        status: "shipped",
        claudeHas: true,
        notes: "SheetJS, fileUrl injected into chat context",
      },
      {
        id: "1.6",
        name: "CSV file upload + data preview",
        status: "shipped",
        claudeHas: true,
        notes: "Full preview with fileUrl for tool",
      },
      {
        id: "1.7",
        name: "Context overflow protection",
        status: "shipped",
        claudeHas: true,
        notes: "Strips base64 images from old tool results",
      },
    ],
  },
  {
    id: "phase-2",
    name: "Phase 2 — Quick Wins",
    description: "Artifact types, file generation, interactive content",
    features: [
      {
        id: "2.1",
        name: "HTML artifact live rendering",
        status: "shipped",
        claudeHas: true,
        notes: "Sandboxed iframe, blob URL",
      },
      {
        id: "2.2",
        name: "React artifact live rendering",
        status: "shipped",
        claudeHas: true,
        notes: "Babel + React CDN wrapper in iframe",
      },
      {
        id: "2.3",
        name: "SVG artifact rendering",
        status: "shipped",
        claudeHas: true,
        notes: "dangerouslySetInnerHTML in Render tab",
      },
      {
        id: "2.4",
        name: "Mermaid diagram rendering in panel",
        status: "shipped",
        claudeHas: true,
        notes: "Reuses MermaidDiagram component",
      },
      {
        id: "2.5",
        name: "Markdown report rendering",
        status: "shipped",
        claudeHas: true,
        notes: "ReactMarkdown in Preview tab",
      },
      {
        id: "2.6",
        name: "File download button",
        status: "shipped",
        claudeHas: true,
        notes: "DOWNLOAD_FILE marker → Blob → download icon",
      },
      {
        id: "2.7",
        name: "python-pptx / python-docx in E2B",
        status: "shipped",
        claudeHas: true,
        notes: "Pre-installed on session creation",
      },
      {
        id: "2.8",
        name: "PowerPoint generation (PPTX)",
        status: "in-progress",
        claudeHas: true,
        notes: "Environment ready — needs E2E smoke test",
      },
      {
        id: "2.9",
        name: "Word document generation (DOCX)",
        status: "in-progress",
        claudeHas: true,
        notes: "Environment ready — needs E2E smoke test",
      },
      {
        id: "2.10",
        name: "Interactive charts (Chart.js / Plotly)",
        status: "in-progress",
        claudeHas: true,
        notes: "Works via HTML artifact; needs testing",
      },
      {
        id: "2.11",
        name: "PyPI package install at runtime",
        status: "shipped",
        claudeHas: true,
        notes: "AI can pip install; prompt guidance added",
      },
    ],
  },
  {
    id: "phase-3",
    name: "Phase 3 — File Generation",
    description: "Full Office document creation and download",
    features: [
      {
        id: "3.1",
        name: "PDF generation (reportlab)",
        status: "planned",
        claudeHas: true,
        notes: "reportlab pre-installed; needs prompt + test",
      },
      {
        id: "3.2",
        name: "Excel generation from scratch (xlsxwriter)",
        status: "planned",
        claudeHas: true,
        notes: "xlsxwriter pre-installed; formulas, charts, formatting",
      },
      {
        id: "3.3",
        name: "PDF upload + text extraction",
        status: "planned",
        claudeHas: true,
        notes: "pdfplumber in E2B; needs ingest route",
      },
      {
        id: "3.4",
        name: "DOCX upload + text extraction",
        status: "planned",
        claudeHas: true,
        notes: "python-docx can read; needs ingest route",
      },
      {
        id: "3.5",
        name: "Format conversion (PDF → PPTX, etc.)",
        status: "planned",
        claudeHas: true,
        notes: "Parse + summarize + reformat via Python",
      },
    ],
  },
  {
    id: "phase-4",
    name: "Phase 4 — Visualizations",
    description: "D3, Three.js, p5.js, advanced interactivity",
    features: [
      {
        id: "4.1",
        name: "D3.js data visualizations",
        status: "planned",
        claudeHas: true,
        notes: "CDN-loaded in HTML artifact — works today",
      },
      {
        id: "4.2",
        name: "Three.js 3D graphics",
        status: "planned",
        claudeHas: true,
        notes: "CDN-loaded in HTML artifact",
      },
      {
        id: "4.3",
        name: "p5.js generative art / Canvas",
        status: "planned",
        claudeHas: true,
        notes: "CDN-loaded in HTML artifact",
      },
      {
        id: "4.4",
        name: "Resizable Artifacts panel",
        status: "planned",
        claudeHas: false,
        notes: "Draggable width for large visualizations",
      },
    ],
  },
  {
    id: "phase-5",
    name: "Phase 5 — Artifact Enhancements",
    description: "Version history, sharing, persistence",
    features: [
      {
        id: "5.1",
        name: "Artifact version history",
        status: "planned",
        claudeHas: true,
        notes: "Array of ArtifactData, switcher UI",
      },
      {
        id: "5.2",
        name: "Artifact inline editing",
        status: "planned",
        claudeHas: true,
        notes: "Edit code in panel → re-execute",
      },
      {
        id: "5.3",
        name: "Artifact fullscreen mode",
        status: "planned",
        claudeHas: false,
        notes: "Expand to full viewport",
      },
      {
        id: "5.4",
        name: "Artifact share / publish URL",
        status: "backlog",
        claudeHas: true,
        notes: "/artifacts/[id] public page",
      },
      {
        id: "5.5",
        name: "Artifact persistent storage",
        status: "backlog",
        claudeHas: true,
        notes: "postMessage API, DB-backed, 20MB limit",
      },
    ],
  },
  {
    id: "phase-6",
    name: "Phase 6 — Platform",
    description: "AI-powered artifacts, team sharing, catalog",
    features: [
      {
        id: "6.1",
        name: "AI-powered artifacts (embed model API)",
        status: "backlog",
        claudeHas: true,
        notes: "Artifact calls Claude API via MCP",
      },
      {
        id: "6.2",
        name: "Team artifact sharing",
        status: "backlog",
        claudeHas: true,
        notes: "Multi-tenant access control",
      },
      {
        id: "6.3",
        name: "Artifact catalog / community gallery",
        status: "backlog",
        claudeHas: true,
        notes: "/catalog page, public artifacts",
      },
    ],
  },
];

function StatusBadge({ status }: { status: FeatureStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}
    >
      <Icon className="size-3.5" />
      {config.label}
    </span>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-2.5 px-4 text-xs text-muted-foreground font-mono w-12">
        {feature.id}
      </td>
      <td className="py-2.5 px-4 text-sm font-medium">{feature.name}</td>
      <td className="py-2.5 px-4">
        <StatusBadge status={feature.status} />
      </td>
      <td className="py-2.5 px-4 text-center">
        {feature.claudeHas ? (
          <span className="text-green-500 text-sm">✓</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>
      <td className="py-2.5 px-4 text-xs text-muted-foreground">
        {feature.notes}
      </td>
    </tr>
  );
}

function PhaseSection({ phase }: { phase: Phase }) {
  const shipped = phase.features.filter((f) => f.status === "shipped").length;
  const total = phase.features.length;
  const pct = Math.round((shipped / total) * 100);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold">{phase.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phase.description}
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium">
            {shipped}/{total}
          </span>
          <div className="text-xs text-muted-foreground">{pct}% complete</div>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 mb-4">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground w-12">
                #
              </th>
              <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">
                Feature
              </th>
              <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground w-32">
                Status
              </th>
              <th className="py-2 px-4 text-center text-xs font-medium text-muted-foreground w-24">
                Claude.ai
              </th>
              <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {phase.features.map((f) => (
              <FeatureRow key={f.id} feature={f} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  const allFeatures = PHASES.flatMap((p) => p.features);
  const totalShipped = allFeatures.filter((f) => f.status === "shipped").length;
  const totalInProgress = allFeatures.filter(
    (f) => f.status === "in-progress",
  ).length;
  const totalPlanned = allFeatures.filter((f) => f.status === "planned").length;
  const totalBacklog = allFeatures.filter((f) => f.status === "backlog").length;
  const claudeParity = allFeatures.filter(
    (f) => f.claudeHas && f.status === "shipped",
  ).length;
  const claudeTotal = allFeatures.filter((f) => f.claudeHas).length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Feature Tracker</h1>
        <p className="text-muted-foreground text-sm">
          Python execution, Artifacts, and file generation capabilities — parity
          roadmap vs Claude.ai
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        {[
          {
            label: "Shipped",
            value: totalShipped,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-950/30",
          },
          {
            label: "In Progress",
            value: totalInProgress,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Planned",
            value: totalPlanned,
            color: "text-yellow-600 dark:text-yellow-400",
            bg: "bg-yellow-50 dark:bg-yellow-950/30",
          },
          {
            label: "Backlog",
            value: totalBacklog,
            color: "text-muted-foreground",
            bg: "bg-muted/40",
          },
          {
            label: "Claude Parity",
            value: `${claudeParity}/${claudeTotal}`,
            color: "text-primary",
            bg: "bg-primary/5",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border border-border p-4 ${card.bg}`}
          >
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Phase sections */}
      {PHASES.map((phase) => (
        <PhaseSection key={phase.id} phase={phase} />
      ))}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
        <p>
          Source of truth:{" "}
          <code className="bg-muted px-1 py-0.5 rounded">
            docs/features/feature_list.md
          </code>{" "}
          · Gap analysis:{" "}
          <code className="bg-muted px-1 py-0.5 rounded">
            docs/tips-guides/claude-ai-capability-gap-analysis.md
          </code>
        </p>
      </div>
    </div>
  );
}
