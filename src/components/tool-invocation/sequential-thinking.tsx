"use client";

import { ToolInvocationUIPart } from "app-types/chat";

import { cn, toAny } from "lib/utils";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CircleIcon,
  Loader2Icon,
} from "lucide-react";
import { motion } from "framer-motion";

import { TextShimmer } from "ui/text-shimmer";
import { ThoughtData } from "lib/ai/tools/thinking/sequential-thinking";
import { WordByWordFadeIn } from "../markdown";

interface SequentialThinkingToolInvocationProps {
  part: ToolInvocationUIPart["toolInvocation"];
}

function PureSequentialThinkingToolInvocation({
  part,
}: SequentialThinkingToolInvocationProps) {
  const createdAt = useRef(Date.now());
  const initState = useRef(part.state);
  const [expanded, setExpanded] = useState(true);

  const [isDiff, setIsDiff] = useState(false);

  const thinkingData = useMemo(() => {
    return (toAny(part).result || part.args) as
      | { steps: Partial<ThoughtData>[] }
      | undefined;
  }, [part.args, part.state]);

  const steps = useMemo(() => {
    return thinkingData?.steps || [];
  }, [thinkingData]);

  const second = useMemo(() => {
    if (!isDiff) return;
    return Math.floor((Date.now() - createdAt.current) / 1000);
  }, [part.state]);

  const header = useMemo(() => {
    const message = `Reasoned for ${second ? `${second} seconds` : "a few seconds"}`;
    if (part.state == "result") return message;
    return <TextShimmer>{message}</TextShimmer>;
  }, [part.state, second]);

  useEffect(() => {
    if (initState.current == "result") return;
    return () => {
      setIsDiff(true);
    };
  }, [part.state]);

  return (
    <div className="flex w-full px-2">
      <div className="flex flex-col">
        <div
          onClick={() => setExpanded(!expanded)}
          className="text-sm cursor-pointer text-muted-foreground select-none flex gap-2 items-center hover:text-foreground transition-colors"
        >
          {header}
          <ChevronDownIcon
            className={cn(
              "size-3 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
        <div className={cn("pl-[7px] flex gap-4", !expanded && "hidden")}>
          <div className="flex flex-col py-4 px-2">
            {steps.map((step, index) => {
              const isLastStep = index === steps.length - 1;
              const isRunning = isLastStep && part.state !== "result";
              const isStepFinal = part.state === "result" && isLastStep;
              const isOnlyOneStep = steps.length === 1 && index == 0;

              return (
                <div
                  key={index}
                  className="flex flex-col gap-1 group/step text-muted-foreground relative pb-4"
                >
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      isOnlyOneStep && "hidden",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-full flex items-center justify-center p-1 bg-secondary fade-in animate-in duration-500",
                        isLastStep && "bg-primary text-primary-foreground",
                      )}
                    >
                      {isStepFinal ? (
                        <CheckIcon className="size-2 stroke-4" />
                      ) : isRunning ? (
                        <Loader2Icon className="size-2 animate-spin " />
                      ) : (
                        <CircleIcon className="size-2 text-foreground stroke-background fill-background" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        (isStepFinal || isRunning) &&
                          "text-foreground font-semibold",
                        isRunning && "animate-pulse",
                      )}
                    >
                      {isStepFinal ? `Final Step` : `Step ${index + 1}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground break-words px-2 ml-4.5 group-hover/step:text-foreground transition-colors">
                    <WordByWordFadeIn>{step.thought}</WordByWordFadeIn>
                  </p>
                  {!isLastStep && (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.3,
                        ease: "easeOut",
                      }}
                      className={cn(
                        "h-full ml-[7px] w-[2px] bg-border absolute top-4 origin-top",
                        index == steps.length - 2 &&
                          "bg-gradient-to-b from-40% from-border to-primary",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SequentialThinkingToolInvocation = memo(
  PureSequentialThinkingToolInvocation,
);
