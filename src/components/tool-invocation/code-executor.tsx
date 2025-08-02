import { useCopy } from "@/hooks/use-copy";
import { ToolInvocationUIPart } from "app-types/chat";
import { callCodeRunWorker } from "lib/code-runner/call-worker";

import {
  CodeRunnerResult,
  LogEntry,
} from "lib/code-runner/code-runner.interface";
import { cn, isString, toAny } from "lib/utils";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronRight,
  CopyIcon,
  Loader,
  Percent,
  PlayIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { safe } from "ts-safe";

import { CodeBlock } from "ui/CodeBlock";
import { Skeleton } from "ui/skeleton";
import { TextShimmer } from "ui/text-shimmer";

export const CodeExecutor = memo(function CodeExecutor({
  part,
  onResult,
  type,
}: {
  part: ToolInvocationUIPart["toolInvocation"];
  onResult?: (result?: any) => void;
  type: "javascript" | "python";
}) {
  const isRun = useRef(false);

  const { copy, copied } = useCopy();
  const [isExecuting, setIsExecuting] = useState(false);

  const lastStartedAt = useRef<number>(Date.now());

  const [realtimeLogs, setRealtimeLogs] = useState<
    (CodeRunnerResult["logs"][number] & { time: number })[]
  >([]);

  const codeResultContainerRef = useRef<HTMLDivElement>(null);

  const runCode = useCallback(
    async (code: string, type: "javascript" | "python") => {
      lastStartedAt.current = Date.now();
      const result = await callCodeRunWorker(type, {
        code,
        timeout: 30000,
        onLog: (log) => {
          setRealtimeLogs((prev) => [...prev, { ...log, time: Date.now() }]);
        },
      });
      return result;
    },
    [],
  );

  const menualToolCall = useCallback(
    async (code: string) => {
      const result = await runCode(code, type);

      const logstring = JSON.stringify(result.logs);

      onResult?.({
        ...toAny({
          ...result,
          logs:
            logstring.length > 5000
              ? [
                  {
                    type: "info",
                    args: [
                      {
                        type: "data",
                        value:
                          "Log output exceeded storage limit (10KB). Full output was displayed to user but truncated for server storage.",
                      },
                    ],
                  },
                ]
              : result.logs,
        }),
        guide:
          "Execution finished. Provide: 1) Main results/outputs 2) Key insights or findings 3) Error explanations if any. Don't repeat code or raw logs - interpret and summarize for the user.",
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
    return part.result as CodeRunnerResult;
  }, [part]);

  const logs = useMemo(() => {
    const error = result?.error;
    const logs: (LogEntry & { time?: number })[] = realtimeLogs.length
      ? realtimeLogs
      : (result?.logs ?? []);

    if (error) {
      logs.push({
        type: "error",
        args: [{ type: "data", value: error }],
        time: lastStartedAt.current,
      });
    }

    return logs.map((log, i) => {
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
          <div className="flex-1 min-w-0 whitespace-pre-wrap gap-1">
            {log.args.map((arg, i) => {
              if (arg.type == "image") {
                /* eslint-disable-next-line @next/next/no-img-element */
                return <img key={i} src={arg.value} alt="Code output" />;
              }
              return (
                <span key={i}>
                  {isString(arg?.value)
                    ? arg.value.toString()
                    : JSON.stringify(arg.value ?? arg)}
                </span>
              );
            })}
          </div>
        </div>
      );
    });
  }, [part, realtimeLogs]);

  const reExecute = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setRealtimeLogs([
      {
        type: "log",
        args: [{ type: "data", value: "Re-executing code..." }],
        time: Date.now(),
      },
    ]);
    const code = part.args?.code;

    safe(() => runCode(code, type)).watch(() => setIsExecuting(false));
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
          <div className="text-[7px] bg-input rounded-xs w-4 h-4 p-0.5 flex items-end justify-end font-bold">
            {type == "javascript" ? "JS" : type == "python" ? "PY" : ">_"}
          </div>
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
      <div className="p-4 text-[10px] text-foreground flex flex-col gap-1 border-t">
        <div className="text-foreground flex items-center gap-1">
          {isRunning ? (
            <Loader className="size-2 animate-spin" />
          ) : (
            <div className="w-1 h-1 mr-1 ring ring-border rounded-full" />
          )}
          better-chatbot
          <Percent className="size-2" />
        </div>
        {logs}
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
      menualToolCall(part.args.code);
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
        <div className="border overflow-x-hidden relative rounded-lg shadow fade-in animate-in duration-500">
          <div className="py-2.5 bg-border px-4 flex items-center gap-1.5 z-10 min-h-[37px]">
            {header}
            <div className="flex-1" />

            {part.state == "result" && (
              <>
                <div
                  className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-1 transition-all rounded-sm cursor-pointer hover:bg-input hover:text-foreground font-semibold"
                  onClick={reExecute}
                >
                  <PlayIcon className="size-2" />
                  Run
                </div>
                <div
                  className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-1 transition-all rounded-sm cursor-pointer hover:bg-input hover:text-foreground font-semibold"
                  onClick={() => copy(part.args?.code ?? "")}
                >
                  {copied ? (
                    <CheckIcon className="size-2" />
                  ) : (
                    <CopyIcon className="size-2" />
                  )}
                  Copy
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <div className="absolute pointer-events-none top-0 left-0 w-full h-1/6 bg-gradient-to-b from-background to-transparent z-10" />
            <div className="absolute pointer-events-none bottom-0 left-0 w-full h-1/6 bg-gradient-to-t from-background to-transparent z-10" />
            <div className="absolute pointer-events-none top-0 left-0 w-1/6 h-full bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute pointer-events-none top-0 right-0 w-1/6 h-full bg-gradient-to-l from-background to-transparent z-10" />
            <div
              className="min-h-14 p-6 text-xs overflow-y-auto max-h-[40vh] "
              ref={codeResultContainerRef}
            >
              <CodeBlock
                className="p-4 text-[10px] overflow-x-auto"
                code={part.args?.code}
                lang={type}
                fallback={fallback}
              />
            </div>
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
