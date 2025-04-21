"use client";

import { callMcpToolAction } from "@/app/api/mcp/actions";
import { cn } from "lib/utils";
import { Check, Loader2, Play, X } from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { Button } from "ui/button";

interface CodeBlockProps {
  code: string;
  language: string;
  className?: string;
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
  } | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const result = await callMcpToolAction(
        "custom-mcp-server",
        "code_execute",
        {
          code,
          language,
        },
      );

      if (result && result.content && result.content.length > 0) {
        setExecutionResult({
          success: result.success || false,
          output: result.output,
          error: result.error,
          executionTime: result.executionTime,
        });
      } else {
        throw new Error("Invalid response from code execution");
      }
    } catch (error) {
      toast.error(
        `Failed to execute code: ${error instanceof Error ? error.message : String(error)}`,
      );
      setExecutionResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className={cn("relative rounded-md overflow-hidden my-4", className)}>
      <div className="flex items-center justify-between bg-zinc-800 px-4 py-2">
        <div className="text-sm text-zinc-400">{language}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExecute}
          disabled={isExecuting}
          className="text-zinc-400 hover:text-white"
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Execute
            </>
          )}
        </Button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {code}
      </SyntaxHighlighter>

      {executionResult && (
        <div
          className={cn(
            "p-4 text-sm font-mono whitespace-pre-wrap",
            executionResult.success
              ? "bg-green-950 text-green-200"
              : "bg-red-950 text-red-200",
          )}
        >
          <div className="flex items-center mb-2">
            {executionResult.success ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-400" />
                <span className="text-green-400 font-semibold">
                  Execution successful
                  {executionResult.executionTime &&
                    ` (${executionResult.executionTime}ms)`}
                </span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2 text-red-400" />
                <span className="text-red-400 font-semibold">
                  Execution failed
                </span>
              </>
            )}
          </div>
          {executionResult.output && (
            <div className="mt-2">
              <div className="text-xs text-zinc-400 mb-1">Output:</div>
              {executionResult.output}
            </div>
          )}
          {executionResult.error && (
            <div className="mt-2">
              <div className="text-xs text-zinc-400 mb-1">Error:</div>
              {executionResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
