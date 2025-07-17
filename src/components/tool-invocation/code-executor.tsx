import { ToolInvocationUIPart } from "app-types/chat";
import { SafeJsExecutionResult, safeJsRun } from "lib/safe-js-run";
import { cn, isObject, toAny } from "lib/utils";
import { AlertTriangleIcon, ChevronRight, Loader, Percent } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { safe } from "ts-safe";
import { CodeBlock } from "ui/CodeBlock";
import { Skeleton } from "ui/skeleton";
import { TextShimmer } from "ui/text-shimmer";

export const CodeExecutor = memo(function CodeExecutor({
  part,
  onResult,
}: {
  part: ToolInvocationUIPart["toolInvocation"];
  onResult?: (result?: any) => void;
}) {
  const isRun = useRef(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const [realtimeLogs, setRealtimeLogs] = useState<
    (SafeJsExecutionResult["logs"][number] & { time: number })[]
  >([]);

  const codeResultContainerRef = useRef<HTMLDivElement>(null);

  const runCode = useCallback(
    async (code: string, input: any) => {
      const result = await safeJsRun(code, input, 60000, (log) => {
        setRealtimeLogs((prev) => [...prev, { ...log, time: Date.now() }]);
      });

      onResult?.({
        ...toAny(result),
        guide:
          "The code has already been executed and displayed to the user. Please provide only the output results from console.log() or error details if any occurred. Do not repeat the code itself.",
      });
    },
    [onResult],
  );

  const isRunning = useMemo(() => {
    return isExecuting || part.state != "result";
  }, [isExecuting, part.state]);

  const scrollToCode = useCallback(() => {
    codeResultContainerRef.current?.scrollTo({
      top: codeResultContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const result = useMemo(() => {
    if (part.state != "result") return null;
    return part.result as SafeJsExecutionResult;
  }, [part]);

  const logs = useMemo(() => {
    const error = result?.error;
    const logs = realtimeLogs.length ? realtimeLogs : (result?.logs ?? []);

    if (error) {
      return [{ type: "error", args: [error], time: Date.now() }, ...logs];
    }

    return logs;
  }, [part, realtimeLogs]);

  const reExecute = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setRealtimeLogs([
      { type: "info", args: ["Re-executing code..."], time: Date.now() },
    ]);
    const code = part.args?.code;
    const input = part.args?.input;
    safe(() =>
      safeJsRun(code, input, 60000, (log) => {
        setRealtimeLogs((prev) => [...prev, { ...log, time: Date.now() }]);
      }),
    ).watch(() => setIsExecuting(false));
  }, [part.args, isExecuting]);

  const header = useMemo(() => {
    if (isRunning)
      return (
        <>
          <Loader className="size-3 animate-spin text-muted-foreground" />
          <TextShimmer className="text-xs">Generating Code...</TextShimmer>
        </>
      );
    return (
      <>
        {result?.error ? (
          <>
            <AlertTriangleIcon className="size-3 text-destructive" />
            <span className="text-destructive text-xs">ERROR</span>
          </>
        ) : (
          <>
            <div className="text-[7px] bg-border rounded-xs w-4 h-4 p-0.5 flex items-end justify-end font-bold">
              JS
            </div>
          </>
        )}
      </>
    );
  }, [part.state, result, isRunning]);

  const fallback = useMemo(() => {
    return <CodeFallback />;
  }, []);

  const logContainer = useMemo(() => {
    if (!logs.length) return null;
    return (
      <div className="p-4 text-[10px] text-foreground flex flex-col gap-1">
        <div className="text-foreground flex items-center gap-1">
          {isRunning ? (
            <Loader className="size-2 animate-spin" />
          ) : (
            <div className="w-1 h-1 mr-1 ring ring-border rounded-full" />
          )}
          better-chatbot
          <Percent className="size-2" />
          {part.state == "result" && (
            <div
              className="hover:text-foreground ml-auto px-2 py-1 rounded-sm cursor-pointer text-muted-foreground/80"
              onClick={reExecute}
            >
              retry
            </div>
          )}
        </div>
        {logs.map((log, i) => {
          return (
            <div
              key={i}
              className={cn(
                "flex gap-1 text-muted-foreground pl-3",
                log.type == "error" && "text-destructive",
                log.type == "warn" && "text-yellow-500",
              )}
            >
              <div className="w-[8.6rem] hidden md:block">
                {new Date(toAny(log).time || Date.now()).toISOString()}
              </div>
              <div className="h-[15px] flex items-center">
                {log.type == "error" ? (
                  <AlertTriangleIcon className="size-2" />
                ) : log.type == "warn" ? (
                  <AlertTriangleIcon className="size-2" />
                ) : (
                  <ChevronRight className="size-2" />
                )}
              </div>
              <div className="flex-1 min-w-0 whitespace-pre-wrap">
                {log.args
                  .map((arg) =>
                    isObject(arg) ? JSON.stringify(arg) : arg.toString(),
                  )
                  .join(" ")}
              </div>
            </div>
          );
        })}
        {isRunning && (
          <div className="ml-3 animate-caret-blink text-muted-foreground">
            |
          </div>
        )}
      </div>
    );
  }, [logs, isRunning]);

  useEffect(() => {
    if (onResult && part.args && part.state == "call" && !isRun.current) {
      isRun.current = true;
      runCode(part.args.code, part.args.input);
    }
  }, [part.state, !!onResult]);

  useEffect(() => {
    if (isRunning) {
      const closeKey = setInterval(scrollToCode, 300);
      return () => clearInterval(closeKey);
    } else if (part.state == "result" && isRun.current) {
      scrollToCode();
    }
  }, [isRunning]);

  return (
    <div className="flex flex-col">
      <div className="px-6 py-3">
        <div
          ref={codeResultContainerRef}
          onClick={scrollToCode}
          className="border overflow-y-auto overflow-x-hidden max-h-[70vh] relative rounded-lg shadow fade-in animate-in duration-500"
        >
          <div className="sticky top-0 py-2.5 px-4 flex items-center gap-1.5 z-10 border-b bg-background min-h-[37px]">
            {header}
            <div className="flex-1" />
            <div className="w-1.5 h-1.5 rounded-full bg-input" />
            <div className="w-1.5 h-1.5 rounded-full bg-input" />
            <div className="w-1.5 h-1.5 rounded-full bg-input" />
          </div>

          <div className={`min-h-14 p-6 text-xs`}>
            <CodeBlock
              className="p-4 text-[10px] overflow-x-auto"
              code={part.args?.code}
              lang="javascript"
              fallback={fallback}
            />
          </div>
          {logContainer}
        </div>
      </div>
    </div>
  );
});

function CodeFallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-1/6" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}
