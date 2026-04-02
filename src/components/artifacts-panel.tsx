"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart2, Code2, Copy, Check, Eye, Download } from "lucide-react";
import { Button } from "ui/button";
import { appStore } from "@/app/store";
import { useCopy } from "@/hooks/use-copy";
import type { ArtifactData, ArtifactContentType } from "lib/e2b/types";
import { MermaidDiagram } from "./mermaid-diagram";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Wrap a React/JSX snippet in a full HTML page with CDN deps so it renders in an iframe
function wrapReactForIframe(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet" />
  <style>body { margin: 0; padding: 1rem; background: white; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    const rootEl = document.getElementById('root');
    // Try to find an exported default component
    const App = typeof module !== 'undefined' && module.exports?.default
      ? module.exports.default
      : typeof App !== 'undefined' ? App : null;
    if (App) {
      ReactDOM.createRoot(rootEl).render(React.createElement(App));
    } else {
      rootEl.innerHTML = '<p style="color:red">No default export found. Export a default function component named App.</p>';
    }
  </script>
</body>
</html>`;
}

function getTabsForType(
  contentType: ArtifactContentType,
): Array<"preview" | "render" | "code"> {
  if (contentType === "python") return ["preview", "code"];
  if (contentType === "markdown") return ["preview", "code"];
  return ["render", "code"];
}

function getDefaultTab(
  contentType: ArtifactContentType,
): "preview" | "render" | "code" {
  if (contentType === "python" || contentType === "markdown") return "preview";
  return "render";
}

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
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
      <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function PreviewTab({ artifact }: { artifact: ArtifactData }) {
  if (artifact.contentType === "markdown" && artifact.stdout) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {artifact.stdout}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

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

function RenderTab({ artifact }: { artifact: ArtifactData }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    if (artifact.contentType === "html") {
      const blob = new Blob([artifact.code], { type: "text/html" });
      url = URL.createObjectURL(blob);
    } else if (artifact.contentType === "react") {
      const html = wrapReactForIframe(artifact.code);
      const blob = new Blob([html], { type: "text/html" });
      url = URL.createObjectURL(blob);
    }

    setBlobUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [artifact.code, artifact.contentType]);

  if (artifact.contentType === "svg") {
    return (
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
        <div
          className="max-w-full"
          dangerouslySetInnerHTML={{ __html: artifact.code }}
        />
      </div>
    );
  }

  if (artifact.contentType === "mermaid") {
    return (
      <div className="flex-1 overflow-auto">
        <MermaidDiagram chart={artifact.code} />
      </div>
    );
  }

  if (artifact.contentType === "markdown") {
    // Markdown preview handled by PreviewTab — shouldn't reach here
    return null;
  }

  // html / react — iframe
  if (!blobUrl) return null;

  return (
    <iframe
      ref={iframeRef}
      src={blobUrl}
      sandbox="allow-scripts allow-same-origin"
      className="flex-1 w-full border-0 bg-white"
      title={artifact.title}
    />
  );
}

const TAB_LABELS: Record<string, string> = {
  preview: "Preview",
  render: "Render",
  code: "Code",
};

export function ArtifactsPanel() {
  const activeArtifact = appStore((s) => s.activeArtifact);
  const mutate = appStore((s) => s.mutate);

  const contentType = activeArtifact?.contentType ?? "python";
  const tabs = getTabsForType(contentType);
  const defaultTab = getDefaultTab(contentType);
  const [tab, setTab] = useState<"preview" | "render" | "code">(defaultTab);

  // Reset to default tab when artifact changes
  useEffect(() => {
    setTab(getDefaultTab(activeArtifact?.contentType ?? "python"));
  }, [activeArtifact?.id, activeArtifact?.contentType]);

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
              <span className="text-sm font-medium truncate">
                {activeArtifact.title}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {activeArtifact.downloadUrl && (
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                  <a
                    href={activeArtifact.downloadUrl}
                    download={activeArtifact.downloadFilename ?? "download"}
                    title="Download file"
                  >
                    <Download className="size-4" />
                  </a>
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => mutate({ activeArtifact: null })}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-4">
            {tabs.map((t) => (
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
                ) : t === "render" ? (
                  <span className="flex items-center gap-1.5">
                    <Eye className="size-3.5" />
                    {TAB_LABELS[t]}
                  </span>
                ) : (
                  TAB_LABELS[t]
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {tab === "preview" && <PreviewTab artifact={activeArtifact} />}
            {tab === "render" && <RenderTab artifact={activeArtifact} />}
            {tab === "code" && <CodeTab code={activeArtifact.code} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
