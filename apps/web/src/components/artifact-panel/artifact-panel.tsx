"use client";

import { useSandboxKeepalive } from "@/hooks/use-sandbox-keepalive";
import { toAny } from "lib/utils";
import {
  ChevronsRight,
  Code2,
  ExternalLink,
  FileText,
  Loader,
  Monitor,
  PlayCircle,
  RotateCw,
  Share2,
  Table2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { TextShimmer } from "ui/text-shimmer";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { DocumentEditCard } from "../tool-invocation/document-edit-card";
import { TabularReviewCard } from "../tool-invocation/tabular-review";
import { useArtifactPanel } from "./artifact-panel-context";

// ---------------------------------------------------------------------------
// Sandbox (web) panel — ported from e2b-dev/fragments fragment-web.tsx
// ---------------------------------------------------------------------------
/**
 * Asks the chat to publish the current page. Publishing re-authors the page as
 * a standalone document, which only the model can do, so the button drives a
 * chat turn rather than posting to the API directly.
 */
export type ArtifactPanelProps = { onShare?: () => void };

function SandboxPanelContent({ onShare }: ArtifactPanelProps) {
  const { artifact, deployment } = useArtifactPanel();
  const part = artifact?.part;
  const input = toAny(part?.input) as {
    template?: string;
    title?: string;
    code?: string;
    file_path?: string;
    port?: number | null;
    has_additional_dependencies?: boolean;
    install_dependencies_command?: string;
  } | null;
  const output = toAny(part?.output) as {
    url?: string;
    error?: string;
    sbxId?: string;
    ready?: boolean;
    warning?: string;
  } | null;

  const isStreaming = part?.state === "input-streaming";
  const deploymentUrl =
    deployment?.phase === "ready" ? (deployment.url ?? null) : null;

  const [sandboxUrl, setSandboxUrl] = useState<string | null>(
    deploymentUrl ?? output?.url ?? null,
  );
  const [deployError, setDeployError] = useState<string | null>(
    deployment?.phase === "failed"
      ? (deployment.error ?? "Sandbox deployment failed.")
      : (output?.error ?? null),
  );
  const sbxId = deployment?.sbxId ?? output?.sbxId ?? null;
  const startupWarning = deployment?.warning ?? output?.warning ?? null;

  // Keeps the sandbox alive only while it is actually being used, and pauses
  // it otherwise. `previewActive` gates the iframe: a suspended preview must
  // be unmounted rather than hidden, or an app that polls would keep
  // auto-resuming the sandbox from a background tab. See the hook for detail.
  const { previewActive, markActive, resume } = useSandboxKeepalive({
    sbxId,
    enabled: Boolean(sbxId && sandboxUrl),
  });

  const [iframeKey, setIframeKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  // The chip (ArtifactChip) is the sole deployer — it calls onResult which
  // sets part.output. We just watch for the URL/error to arrive here.
  useEffect(() => {
    if (deployment?.phase === "ready" && deployment.url) {
      setSandboxUrl(deployment.url);
      setDeployError(null);
    }
    if (deployment?.phase === "failed") {
      setDeployError(deployment.error ?? "Sandbox deployment failed.");
    }
    if (output?.url) setSandboxUrl(output.url);
    if (output?.error) setDeployError(output.error);
  }, [
    deployment?.error,
    deployment?.phase,
    deployment?.url,
    output?.error,
    output?.url,
  ]);

  // Reset when the artifact entry changes (new tool call)
  useEffect(() => {
    setSandboxUrl(deploymentUrl ?? output?.url ?? null);
    setDeployError(
      deployment?.phase === "failed"
        ? (deployment.error ?? "Sandbox deployment failed.")
        : (output?.error ?? null),
    );
    setIframeKey((k) => k + 1);
  }, [artifact?.toolCallId]);

  const phaseLabel = deployment
    ? {
        generating_code: "Generating sandbox code…",
        starting_sandbox: "Starting sandbox…",
        installing: "Installing dependencies…",
        checking_preview: "Checking preview…",
        ready: "Preview ready",
        failed: "Sandbox failed",
      }[deployment.phase]
    : isStreaming
      ? "Generating sandbox code…"
      : "Starting sandbox…";

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "preview" | "code")}
      className="h-full flex flex-col"
      // Parent-level activity signal for the keepalive. Interaction *inside*
      // the cross-origin preview iframe is invisible to us, which is why the
      // hook's idle window is generous rather than tight.
      onPointerDown={markActive}
      onKeyDown={markActive}
      onWheel={markActive}
    >
      {/* Tab bar */}
      <div className="flex items-center justify-center border-b px-2 py-1.5">
        <TabsList className="px-1 py-0 border h-8">
          <TabsTrigger
            value="code"
            className="font-normal text-xs py-1 px-2 gap-1 flex items-center"
          >
            {isStreaming && (
              <Loader strokeWidth={3} className="h-3 w-3 animate-spin" />
            )}
            <Code2 className="size-3" />
            Code
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="font-normal text-xs py-1 px-2 gap-1 flex items-center"
            disabled={!sandboxUrl && !deployError}
          >
            <Monitor className="size-3" />
            Preview
            {!sandboxUrl && !deployError && (
              <Loader strokeWidth={3} className="h-3 w-3 animate-spin" />
            )}
          </TabsTrigger>
        </TabsList>

        {sandboxUrl && (
          <div className="ml-auto flex items-center gap-1">
            {onShare && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs font-normal"
                    onClick={onShare}
                  >
                    <Share2 className="size-3.5" />
                    Share
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Publish a permanent link anyone can open
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIframeKey((k) => k + 1)}
                >
                  <RotateCw className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={sandboxUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ExternalLink className="size-3.5" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>Open in new tab</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Code tab */}
      <TabsContent value="code" className="flex-1 overflow-auto m-0">
        {input?.code ? (
          <pre className="p-4 text-xs font-mono leading-relaxed overflow-auto h-full">
            <code>{input.code}</code>
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <TextShimmer>Generating code…</TextShimmer>
          </div>
        )}
      </TabsContent>

      {/* Preview tab */}
      <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
        {deployError ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <div>
              <p className="font-medium text-destructive text-sm">
                Sandbox error
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {deployError}
              </p>
              {deployment?.failedPhase && (
                <p className="text-xs text-muted-foreground mt-2">
                  Failed during {deployment.failedPhase.replaceAll("_", " ")}.
                </p>
              )}
              {deployment?.requestId && (
                <p className="font-mono text-[10px] text-muted-foreground mt-2">
                  Request {deployment.requestId}
                </p>
              )}
              {deployment?.retryable && (
                <p className="text-xs text-muted-foreground mt-3">
                  Use Retry on the sandbox card to deploy again.
                </p>
              )}
            </div>
          </div>
        ) : sandboxUrl ? (
          <div className="flex flex-col h-full">
            {startupWarning && (
              <div className="px-3 py-2 border-b bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                {startupWarning} You can retry with the refresh button.
              </div>
            )}
            {deployment?.syncError && (
              <div className="px-3 py-2 border-b bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                The preview is running, but the chat could not resume. Use
                Resume chat on the sandbox card.
              </div>
            )}
            {previewActive ? (
              <iframe
                key={iframeKey}
                className="flex-1 w-full border-0"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
                loading="lazy"
                src={sandboxUrl}
                title={input?.title ?? "Sandbox"}
              />
            ) : (
              /* Deliberately unmounts the iframe rather than hiding it: while
                 it is mounted, an app that polls keeps waking the paused
                 sandbox and billing compute from a background tab. */
              <div className="flex-1 w-full flex items-center justify-center p-8 text-center">
                <div className="max-w-xs">
                  <p className="font-medium text-sm">Preview paused</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your work is saved. Resuming takes about a second.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1"
                    onClick={() => {
                      resume();
                      setIframeKey((k) => k + 1);
                    }}
                  >
                    <PlayCircle className="size-3.5" />
                    Resume preview
                  </Button>
                </div>
              </div>
            )}
            {/* URL bar — ported from fragment-web.tsx */}
            <div className="p-2 border-t">
              <div className="flex items-center bg-muted dark:bg-white/10 rounded-2xl px-2 gap-1">
                <Button
                  variant="link"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => setIframeKey((k) => k + 1)}
                >
                  <RotateCw className="size-3.5" />
                </Button>
                <span className="text-muted-foreground text-xs flex-1 truncate">
                  {sandboxUrl}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader className="size-8 animate-spin" />
            <span className="text-sm">{phaseLabel}</span>
            {deployment?.requestId && (
              <span className="font-mono text-[10px]">
                Request {deployment.requestId}
              </span>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Document Edit panel
// ---------------------------------------------------------------------------
function DocumentEditPanelContent() {
  const { artifact } = useArtifactPanel();
  const part = artifact?.part;
  if (!part) return null;
  return (
    <div className="overflow-auto h-full">
      <DocumentEditCard part={part} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabular Review panel
// ---------------------------------------------------------------------------
function TabularPanelContent() {
  const { artifact } = useArtifactPanel();
  const part = artifact?.part;
  if (!part) return null;
  return (
    <div className="overflow-auto h-full">
      <TabularReviewCard part={part} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel header
// ---------------------------------------------------------------------------
function PanelHeader({ onClose }: { onClose: () => void }) {
  const { artifact } = useArtifactPanel();
  const type = artifact?.type;
  const input = toAny(artifact?.part?.input);

  const title =
    type === "sandbox"
      ? (input?.title ?? "Sandbox")
      : type === "document-edit"
        ? "Document Edit"
        : "Tabular Review";

  const Icon =
    type === "sandbox" ? Monitor : type === "document-edit" ? FileText : Table2;

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b min-h-[44px]">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onClose}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Close panel</TooltipContent>
      </Tooltip>
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium truncate">{title}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ArtifactPanel — ported from e2b-dev/fragments preview.tsx
// ---------------------------------------------------------------------------
export function ArtifactPanel({ onShare }: ArtifactPanelProps = {}) {
  const { isOpen, close, artifact } = useArtifactPanel();

  if (!isOpen || !artifact) return null;

  return (
    // Matches Fragments: absolute on mobile, relative in md flex grid
    <div className="absolute md:relative z-10 top-0 right-0 shadow-2xl md:rounded-tl-2xl md:rounded-bl-2xl md:border-l md:border-y bg-popover h-full w-full md:w-1/2 overflow-hidden flex flex-col">
      <PanelHeader onClose={close} />
      <div className="flex-1 overflow-hidden">
        {artifact.type === "sandbox" && (
          <SandboxPanelContent onShare={onShare} />
        )}
        {artifact.type === "document-edit" && <DocumentEditPanelContent />}
        {artifact.type === "tabular" && <TabularPanelContent />}
      </div>
    </div>
  );
}
