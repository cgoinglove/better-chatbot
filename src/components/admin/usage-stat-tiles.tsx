"use client";

import { Cpu, MessageCircle, MessagesSquare, Zap } from "lucide-react";
import { Alert, AlertDescription } from "ui/alert";
import { useTranslations } from "next-intl";
import { AdminUsageOverview } from "app-types/admin";

interface UsageStatTilesProps {
  totals: AdminUsageOverview["totals"];
  usedModelCount: number;
  availableModelCount: number;
}

export function UsageStatTiles({
  totals,
  usedModelCount,
  availableModelCount,
}: UsageStatTilesProps) {
  const t = useTranslations("Admin.Usage");

  const tiles = [
    {
      key: "chats",
      icon: MessagesSquare,
      iconClass: "bg-primary/10 text-primary",
      label: t("chats"),
      value: totals.threads,
      sub: t("activeUsers", { count: totals.activeUsers }),
    },
    {
      key: "messages",
      icon: MessageCircle,
      iconClass: "bg-muted text-muted-foreground",
      label: t("messages"),
      value: totals.messages,
      sub: t("responses", { count: totals.assistantMessages }),
    },
    {
      key: "tokens",
      icon: Zap,
      iconClass: "bg-chart-1/15 text-chart-1",
      label: t("tokens"),
      value: totals.totalTokens,
      sub: t("inputOutput", {
        input: totals.inputTokens.toLocaleString(),
        output: totals.outputTokens.toLocaleString(),
      }),
    },
    {
      key: "models",
      icon: Cpu,
      iconClass: "bg-chart-2/15 text-chart-2",
      label: t("modelsUsed"),
      value: usedModelCount,
      sub: t("ofAvailable", { count: availableModelCount }),
    },
  ];

  return (
    <div className="space-y-3" data-testid="usage-stat-tiles">
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        data-testid="usage-stat-tiles-grid"
      >
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="rounded-lg border bg-card p-3"
            data-testid={`usage-stat-${tile.key}`}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 shrink-0 ${tile.iconClass}`}>
                <tile.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  {tile.label}
                </p>
                <p className="text-xl font-bold">
                  {tile.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {tile.sub}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totals.unattributedMessages > 0 && (
        <Alert data-testid="usage-unattributed-alert">
          <AlertDescription>
            {t("unattributedNotice", { count: totals.unattributedMessages })}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
