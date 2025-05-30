"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import DataGrid, { textEditor } from "react-data-grid";
import { parse, unparse } from "papaparse";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

import "react-data-grid/lib/styles.css";

type SheetEditorProps = {
  content: string;
  saveContent: (content: string, isCurrentVersion: boolean) => void;
  status: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
};

const MIN_ROWS = 50;
const MIN_COLS = 26;

const PureSpreadsheetEditor = ({
  content,
  saveContent
}: SheetEditorProps) => {
  console.log("=== CONTENT ===");
  console.log(content);
  const { theme } = useTheme();

  const parseData = useMemo(() => {
    if (!content?.trim()) return Array(MIN_ROWS).fill(Array(MIN_COLS).fill(""));

    // Parse CSV content
    const result = parse<string[]>(content.trim(), {
      skipEmptyLines: true,
      delimiter: ','
    });

    // Pad rows to MIN_COLS
    const paddedData = result.data.map((row) => {
      const paddedRow = [...row];
      while (paddedRow.length < MIN_COLS) {
        paddedRow.push("");
      }
      return paddedRow;
    });

    // Pad to MIN_ROWS
    while (paddedData.length < MIN_ROWS) {
      paddedData.push(Array(MIN_COLS).fill(""));
    }

    return paddedData;
  }, [content]);
  const columns = useMemo(() => {
    const rowNumberColumn = {
      key: "rowNumber",
      name: "",
      frozen: true,
      width: 50,
      renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
      cellClass: "border-t border-r dark:bg-zinc-950 dark:text-zinc-50",
      headerCellClass: "border-t border-r dark:bg-zinc-900 dark:text-zinc-50",
    };

    const dataColumns = Array.from({ length: MIN_COLS }, (_, i) => ({
      key: i.toString(),
      name: String.fromCharCode(65 + i),
      renderEditCell: textEditor,
      width: 120,
      cellClass: cn(`border-t dark:bg-zinc-950 dark:text-zinc-50`, {
        "border-l": i !== 0,
      }),
      headerCellClass: cn(`border-t dark:bg-zinc-900 dark:text-zinc-50`, {
        "border-l": i !== 0,
      }),
    }));

    return [rowNumberColumn, ...dataColumns];
  }, []);

  const initialRows = useMemo(() => {
    return parseData.map((row, rowIndex) => {
      const rowData: any = {
        id: rowIndex,
        rowNumber: rowIndex + 1,
      };

      columns.slice(1).forEach((col, colIndex) => {
        rowData[col.key] = row[colIndex] || "";
      });

      return rowData;
    });
  }, [parseData, columns]);

  const [localRows, setLocalRows] = useState(initialRows);

  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  const generateCsv = (data: any[][]) => {
    return unparse(data);
  };

  const handleRowsChange = (newRows: any[]) => {
    setLocalRows(newRows);

    const updatedData = newRows.map((row) => {
      return columns.slice(1).map((col) => row[col.key] || "");
    });

    const newCsvContent = generateCsv(updatedData);
    saveContent(newCsvContent, true);
  };

  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  // return <pre>{JSON.stringify(localRows, null, 2)}</pre>;
  return (
    <DataGrid
      rows={localRows}
      columns={columns}
      rowHeight={35}
      headerRowHeight={35}
      onRowsChange={handleRowsChange}
      className={cn("border-none", {
        "rdg-light": theme === "light",
        "rdg-dark": theme === "dark"
      })}
      style={{
        height: "100%",
        border: "none",
        backgroundColor: theme === "dark" ? "rgb(24 24 27)" : "white"
      }}
    />
  );
};

function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === "streaming" && nextProps.status === "streaming") &&
    prevProps.content === nextProps.content &&
    prevProps.saveContent === nextProps.saveContent
  );
}

export const SpreadsheetEditor = memo(PureSpreadsheetEditor, areEqual);
