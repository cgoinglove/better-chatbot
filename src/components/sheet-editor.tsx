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
  saveContent,
  status,
  isCurrentVersion,
  currentVersionIndex,
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
      name: "#",
      frozen: true,
      width: 50,
      renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
      cellClass: "border-t border-r dark:bg-zinc-950 dark:text-zinc-50",
      headerCellClass: "border-t border-r dark:bg-zinc-900 dark:text-zinc-50",
    };

    const dataColumns = [
      {
        key: "A",
        name: "Category",
        renderEditCell: textEditor,
        width: 120,
      },
      {
        key: "B",
        name: "Description",
        renderEditCell: textEditor,
        width: 150,
      },
      {
        key: "C",
        name: "Budgeted Amount",
        renderEditCell: textEditor,
        width: 120,
      },
      {
        key: "D",
        name: "Actual Amount",
        renderEditCell: textEditor,
        width: 120,
      },
      {
        key: "E",
        name: "Difference",
        renderEditCell: textEditor,
        width: 120,
      },
      // Add remaining columns
      ...Array.from({ length: MIN_COLS - 5 }, (_, i) => ({
        key: String.fromCharCode(70 + i),
        name: String.fromCharCode(70 + i),
        renderEditCell: textEditor,
        width: 120,
      })),
    ];

    return [rowNumberColumn, ...dataColumns];
  }, []);

  const initialRows = useMemo(() => {
    return parseData.map((row, rowIndex) => {
      const rowData: any = {
        id: rowIndex,
        rowNumber: rowIndex + 1,
      };

      row.forEach((value, colIndex) => {
        rowData[String.fromCharCode(65 + colIndex)] = value || "";
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
      className={theme === "dark" ? "rdg-dark" : "rdg-light"}
      columns={columns}
      rows={localRows}
      enableVirtualization
      onRowsChange={handleRowsChange}
      onCellClick={(args) => {
        if (args.column.key !== "rowNumber") {
          args.selectCell(true);
        }
      }}
      style={{ height: "100%" }}
      defaultColumnOptions={{
        resizable: true,
        sortable: true,
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
