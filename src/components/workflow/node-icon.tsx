"use client";

import { NodeKind } from "lib/ai/workflow/interface";
import { cn } from "lib/utils";
import {
  BotIcon,
  BoxIcon,
  HouseIcon,
  InfoIcon,
  LandPlotIcon,
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
            ? "bg-green-400"
            : type === NodeKind.Information
              ? "text-foreground bg-input"
              : type === NodeKind.Tool
                ? "bg-indigo-500"
                : type === NodeKind.LLM
                  ? "bg-indigo-500"
                  : "bg-card",
        "p-1 rounded",
        className,
      )}
    >
      <Icon className="size-4 text-foreground" />
    </div>
  );
}
