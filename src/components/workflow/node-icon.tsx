"use client";

import { NodeKind } from "lib/ai/workflow/workflow.interface";
import { cn } from "lib/utils";
import {
  BotIcon,
  BoxIcon,
  HardDriveUpload,
  HouseIcon,
  InfoIcon,
  LandPlotIcon,
  SplitIcon,
  TerminalIcon,
  WrenchIcon,
} from "lucide-react";
import { useMemo } from "react";

export function NodeIcon({
  type,
  className,
}: { type: NodeKind; className?: string }) {
  const Icon = useMemo(() => {
    switch (type) {
      case NodeKind.Start:
        return HouseIcon;
      case NodeKind.End:
        return LandPlotIcon;
      case NodeKind.Information:
        return InfoIcon;
      case NodeKind.Tool:
        return WrenchIcon;
      case NodeKind.LLM:
        return BotIcon;
      case NodeKind.Condition:
        return SplitIcon;
      case NodeKind.Http:
        return HardDriveUpload;
      case NodeKind.Code:
        return TerminalIcon;
      default:
        return BoxIcon;
    }
  }, [type]);

  return (
    <div
      className={cn(
        type === NodeKind.Start
          ? "bg-blue-500"
          : type === NodeKind.End
            ? "bg-green-500"
            : type === NodeKind.Information
              ? "text-foreground bg-input"
              : type === NodeKind.Tool || type === NodeKind.LLM
                ? "bg-indigo-500"
                : type === NodeKind.Code || type === NodeKind.Http
                  ? "bg-rose-500"
                  : type === NodeKind.Condition
                    ? "bg-amber-500"
                    : "bg-card",
        "p-1 rounded",
        className,
      )}
    >
      <Icon className="size-4 text-white" />
    </div>
  );
}
