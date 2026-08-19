import type { ProjectBrainExtraction } from "./extraction-schema";

export type WidgetRow = {
  kind: "table" | "metric" | "todos" | "status";
  slot: string;
  title: string;
  renderData: Record<string, unknown>;
};

/**
 * Combine the LLM-extracted table/metric widgets with the dedicated
 * todos/status extraction fields into the rows materialized to
 * ProjectWidgetTable. Todos/status use fixed slots so refreshes upsert in
 * place; both are skipped when the extraction carries no signal.
 */
export function buildWidgetRows(input: {
  widgets: ProjectBrainExtraction["widgets"];
  todos?: ProjectBrainExtraction["todos"];
  status?: ProjectBrainExtraction["status"];
}): WidgetRow[] {
  const rows: WidgetRow[] = input.widgets.map((widget) => ({
    kind: widget.kind,
    slot: widget.slot,
    title: widget.title,
    renderData:
      widget.kind === "table"
        ? { columns: widget.columns, rows: widget.rows }
        : { items: widget.items },
  }));

  if (input.todos?.length) {
    rows.push({
      kind: "todos",
      slot: "todos",
      title: "To-dos",
      renderData: { items: input.todos },
    });
  }

  if (
    input.status &&
    (input.status.shortSummary ||
      input.status.blockers.length > 0 ||
      input.status.health !== "unknown")
  ) {
    rows.push({
      kind: "status",
      slot: "status",
      title: "Status",
      renderData: { ...input.status },
    });
  }

  return rows;
}
