"use client";

import { ToolUIPart } from "ai";
import equal from "lib/equal";
import { FileIcon, Download } from "lucide-react";
import { memo, useMemo } from "react";
import { TextShimmer } from "ui/text-shimmer";
import { Button } from "ui/button";
import { Badge } from "ui/badge";

interface FileGeneratorToolInvocationProps {
  part: ToolUIPart;
}

interface FileGeneratorResult {
  files: {
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
  description?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PureFileGeneratorToolInvocation({
  part,
}: FileGeneratorToolInvocationProps) {
  const isGenerating = useMemo(() => {
    return !part.state.startsWith("output");
  }, [part.state]);

  const result = useMemo(() => {
    if (!part.state.startsWith("output")) return null;
    return part.output as FileGeneratorResult;
  }, [part.state, part.output]);

  const files = useMemo(() => {
    return result?.files || [];
  }, [result]);

  const hasError = useMemo(() => {
    return (
      part.state === "output-error" ||
      (part.state === "output-available" && result?.files.length === 0)
    );
  }, [part.state, result]);

  // Loading state
  if (isGenerating) {
    return (
      <div className="flex flex-col gap-3">
        <TextShimmer>Generating file...</TextShimmer>
        <div className="bg-muted/30 border border-border/50 rounded-lg p-6 flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <FileIcon className="size-5 animate-pulse" />
            <span className="text-sm">Creating your file...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {!hasError && <FileIcon className="size-4" />}
        <span className="text-sm font-semibold">
          {hasError
            ? "File generation failed"
            : files.length === 1
              ? "File generated"
              : `${files.length} files generated`}
        </span>
      </div>

      {hasError ? (
        <div className="bg-card text-muted-foreground p-6 rounded-lg text-xs border border-border/20">
          {part.errorText ?? "Failed to generate file. Please try again."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result?.description && (
            <p className="text-sm text-muted-foreground">
              {result.description}
            </p>
          )}
          <div className="flex flex-col gap-2">
            {files.map((file, index) => {
              const fileExtension =
                file.filename.split(".").pop()?.toUpperCase() || "FILE";

              return (
                <div
                  key={index}
                  className="bg-muted/60 border border-border/80 rounded-xl p-4 hover:border-primary/50 transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 rounded-lg bg-muted p-3">
                      <FileIcon className="size-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p
                        className="text-sm font-medium line-clamp-1"
                        title={file.filename}
                      >
                        {file.filename}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className="uppercase tracking-wide px-2 py-0.5"
                        >
                          {fileExtension}
                        </Badge>
                        <span>{formatFileSize(file.size)}</span>
                        {file.mimeType && (
                          <span
                            className="truncate max-w-[10rem]"
                            title={file.mimeType}
                          >
                            {file.mimeType}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <a href={file.url} download={file.filename}>
                        <Download className="size-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const FileGeneratorToolInvocation = memo(
  PureFileGeneratorToolInvocation,
  (prev, next) => {
    return equal(prev.part, next.part);
  },
);
