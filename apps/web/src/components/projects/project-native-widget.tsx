"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";

type Widget = {
  id: string;
  kind: "table" | "metric" | "todos" | "status";
  title: string;
  renderData: Record<string, unknown>;
  staleAt?: string | null;
};

const HEALTH_STYLES: Record<string, string> = {
  green: "border-emerald-500/40 text-emerald-600",
  yellow: "border-amber-500/40 text-amber-600",
  red: "border-red-500/40 text-red-600",
  unknown: "border-border text-muted-foreground",
};

const TODO_PRIORITY_STYLES: Record<string, string> = {
  critical: "border-red-500/40 text-red-600",
  high: "border-amber-500/40 text-amber-600",
};

export function ProjectNativeWidget({ widget }: { widget: Widget }) {
  if (widget.kind === "table") {
    const columns = Array.isArray(widget.renderData.columns)
      ? (widget.renderData.columns as Array<{ key: string; label: string }>)
      : [];
    const rows = Array.isArray(widget.renderData.rows)
      ? (widget.renderData.rows as Array<Record<string, unknown>>)
      : [];

    return (
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">{widget.title}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    className="pb-2 text-left text-muted-foreground"
                    key={column.key}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr className="border-t" key={index}>
                  {columns.map((column) => (
                    <td className="py-2" key={column.key}>
                      {String(row[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  if (widget.kind === "metric") {
    const items = Array.isArray(widget.renderData.items)
      ? (widget.renderData.items as Array<{
          label: string;
          value: unknown;
          delta?: unknown;
        }>)
      : [];

    return (
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">{widget.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div className="rounded-lg border p-3" key={item.label}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-semibold">
                {String(item.value ?? "—")}
              </p>
              {item.delta !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {String(item.delta)}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (widget.kind === "todos") {
    const items = Array.isArray(widget.renderData.items)
      ? (widget.renderData.items as Array<{
          title: string;
          status?: string;
          priority?: string;
        }>)
      : [];

    return (
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">{widget.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item, index) => {
            const done = item.status === "done";
            return (
              <div className="flex items-center gap-2 text-sm" key={index}>
                {done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={`flex-1 ${done ? "text-muted-foreground line-through" : ""}`}
                >
                  {item.title}
                </span>
                {item.status === "blocked" && (
                  <Badge
                    variant="outline"
                    className="border-red-500/40 text-red-600 text-[10px] px-1.5 py-0"
                  >
                    blocked
                  </Badge>
                )}
                {!done &&
                  item.priority &&
                  TODO_PRIORITY_STYLES[item.priority] && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${TODO_PRIORITY_STYLES[item.priority]}`}
                    >
                      {item.priority}
                    </Badge>
                  )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  if (widget.kind === "status") {
    const health = String(widget.renderData.health ?? "unknown");
    const progressPct =
      typeof widget.renderData.progressPct === "number"
        ? widget.renderData.progressPct
        : null;
    const blockers = Array.isArray(widget.renderData.blockers)
      ? (widget.renderData.blockers as string[])
      : [];
    const shortSummary = String(widget.renderData.shortSummary ?? "");

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
          <CardTitle className="text-base">{widget.title}</CardTitle>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${HEALTH_STYLES[health] ?? HEALTH_STYLES.unknown}`}
          >
            {health}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {shortSummary && <p>{shortSummary}</p>}
          {progressPct !== null && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPct))}%`,
                  }}
                />
              </div>
            </div>
          )}
          {blockers.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Blockers
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                {blockers.map((blocker, index) => (
                  <li key={index}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
