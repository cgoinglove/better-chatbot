"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { ModelProviderIcon } from "ui/model-provider-icon";
import { useTranslations } from "next-intl";
import { AdminUsageOverview } from "app-types/admin";

type SortKey =
  | "model"
  | "provider"
  | "threadCount"
  | "messageCount"
  | "totalTokens"
  | "lastUsedAt";

interface ModelUsageTableProps {
  models: AdminUsageOverview["models"];
}

export function ModelUsageTable({ models }: ModelUsageTableProps) {
  const t = useTranslations("Admin.Usage");
  const [sortKey, setSortKey] = useState<SortKey>("totalTokens");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sortedModels = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...models].sort((a, b) => {
      if (sortKey === "model" || sortKey === "provider") {
        return dir * a[sortKey].localeCompare(b[sortKey]);
      }
      if (sortKey === "lastUsedAt") {
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return dir * (aTime - bTime);
      }
      return dir * (a[sortKey] - b[sortKey]);
    });
  }, [models, sortKey, sortDirection]);

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "model", label: t("model") },
    { key: "provider", label: t("provider") },
    { key: "threadCount", label: t("chats"), align: "right" },
    { key: "messageCount", label: t("messages"), align: "right" },
    { key: "totalTokens", label: t("tokens"), align: "right" },
    { key: "lastUsedAt", label: t("lastUsed"), align: "right" },
  ];

  return (
    <div
      className="rounded-lg border bg-card w-full overflow-x-auto"
      data-testid="model-usage-table"
    >
      <div className="max-h-[520px] overflow-y-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.align === "right" ? "text-right" : ""}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className={`inline-flex items-center gap-1 hover:text-foreground ${
                      col.align === "right" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {col.label}
                    {sortKey === col.key &&
                      (sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedModels.map((row) => {
              const unused = row.messageCount === 0;
              return (
                <TableRow
                  key={`${row.provider}::${row.model}`}
                  className={unused ? "text-muted-foreground" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ModelProviderIcon
                        provider={row.provider}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="truncate">{row.model}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{row.provider}</span>
                      {!row.available && (
                        <Badge variant="outline">{t("unavailable")}</Badge>
                      )}
                      {row.available && !row.hasApiKey && (
                        <Badge variant="outline">{t("noApiKey")}</Badge>
                      )}
                      {unused && (
                        <Badge variant="secondary">{t("unused")}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.threadCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.messageCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.totalTokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.lastUsedAt
                      ? format(parseISO(row.lastUsedAt), "MMM d, yyyy")
                      : t("never")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
