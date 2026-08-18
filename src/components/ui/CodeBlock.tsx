"use client";
import type { ReactNode } from "react";
import { cn } from "lib/utils";

export function CodeBlock({
  code,
  lang,
  fallback,
  className,
  showLineNumbers = true,
}: {
  code?: string;
  lang: string;
  fallback?: ReactNode;
  className?: string;
  showLineNumbers?: boolean;
}) {
  if (!code) return fallback;

  return (
    <pre lang={lang} className={cn("overflow-x-auto", className)}>
      <div className={cn(showLineNumbers && "pl-12 relative")}>
        {showLineNumbers && (
          <div className="absolute left-0 top-0 w-6 flex flex-col select-none text-right text-muted-foreground">
            {code.split("\n").map((_, index) => (
              <span key={index}>{index + 1}</span>
            ))}
          </div>
        )}
        <code>{code}</code>
      </div>
    </pre>
  );
}
