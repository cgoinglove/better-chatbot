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
              <span className="text-sm font-medium truncate">
                {activeArtifact.title}
              </span>
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
