"use client";

import { ToolUIPart } from "ai";
import equal from "lib/equal";
import { cn } from "lib/utils";
import { ImageIcon, Sparkles } from "lucide-react";
import { memo, useMemo } from "react";
import { TextShimmer } from "ui/text-shimmer";
import { Separator } from "ui/separator";

interface ImageGeneratorToolInvocationProps {
  part: ToolUIPart;
}

interface ImageGenerationResult {
  images: {
    url: string;
    mimeType?: string;
  }[];
  guide?: string;
}

function PureImageGeneratorToolInvocation({
  part,
}: ImageGeneratorToolInvocationProps) {
  const isGenerating = useMemo(() => {
    return !part.state.startsWith("output");
  }, [part.state]);

  const result = useMemo(() => {
    if (!part.state.startsWith("output")) return null;
    return part.output as ImageGenerationResult;
  }, [part.state, part.output]);

  const images = useMemo(() => {
    return result?.images || [];
  }, [result]);

  const guide = useMemo(() => {
    return result?.guide;
  }, [result]);

  const hasError = useMemo(() => {
    return part.state === "output-error";
  }, [part.state]);

  // Simple loading state like web-search
  if (isGenerating) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="size-5 wiggle text-muted-foreground" />
        <TextShimmer>Generating image...</TextShimmer>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ImageIcon className="size-5 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {hasError ? "Image generation failed" : "Image generated"}
        </span>
      </div>

      {/* Content */}
      <div className="flex gap-2">
        <div className="px-2.5">
          <Separator
            orientation="vertical"
            className="bg-gradient-to-b from-border to-transparent from-80%"
          />
        </div>
        <div className="w-full flex flex-col gap-3 pb-2">
          {/* Prompt */}
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="line-clamp-2">
              {(part.input as any)?.prompt || "Generating..."}
            </p>
          </div>

          {/* Images */}
          {hasError ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">
              Failed to generate image. Please try again.
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-3",
                  images.length === 1
                    ? "grid-cols-1 max-w-2xl"
                    : "grid-cols-1 md:grid-cols-2 max-w-3xl",
                )}
              >
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-border hover:border-primary transition-all shadow-sm hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-auto object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <a
                        href={image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guide Message */}
              {guide && (
                <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p>{guide}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const ImageGeneratorToolInvocation = memo(
  PureImageGeneratorToolInvocation,
  (prev, next) => {
    return equal(prev.part, next.part);
  },
);
