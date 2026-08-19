import { describe, expect, it } from "vitest";
import { buildWidgetRows } from "./widget-rows";

const tableWidget = {
  kind: "table" as const,
  slot: "inbox",
  title: "Recent emails",
  columns: [{ key: "subject", label: "Subject", type: "text" as const }],
  rows: [{ subject: "Hello" }],
};

describe("buildWidgetRows", () => {
  it("maps extracted table widgets and appends todos + status rows", () => {
    const rows = buildWidgetRows({
      widgets: [tableWidget],
      todos: [
        {
          title: "Ship it",
          status: "open" as const,
          priority: "high" as const,
        },
      ],
      status: {
        health: "green" as const,
        blockers: [],
        shortSummary: "On track",
      },
    });

    expect(rows.map((row) => row.slot)).toEqual(["inbox", "todos", "status"]);
    expect(rows[0].renderData).toEqual({
      columns: tableWidget.columns,
      rows: tableWidget.rows,
    });
    expect(rows[1].kind).toBe("todos");
    expect(rows[2].renderData).toMatchObject({ health: "green" });
  });

  it("skips todos and status when the extraction carries no signal", () => {
    const rows = buildWidgetRows({
      widgets: [],
      todos: [],
      status: { health: "unknown" as const, blockers: [], shortSummary: "" },
    });
    expect(rows).toEqual([]);
  });
});
