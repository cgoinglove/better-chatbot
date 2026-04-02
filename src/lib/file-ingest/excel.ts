import * as XLSX from "xlsx";

export interface ExcelSheetPreview {
  name: string;
  columns: string[];
  rowCount: number;
}

export interface ExcelPreview {
  sheetNames: string[];
  sheets: ExcelSheetPreview[];
  totalSheets: number;
}

export function parseExcelPreview(content: Buffer): ExcelPreview {
  const workbook = XLSX.read(content, { type: "buffer" });
  const sheetNames = workbook.SheetNames;

  const sheets: ExcelSheetPreview[] = sheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    const header = (rows[0] as string[]) ?? [];
    const columns = header.map(String).filter(Boolean);
    const rowCount = Math.max(0, rows.length - 1);
    return { name, columns, rowCount };
  });

  return { sheetNames, sheets, totalSheets: sheetNames.length };
}

export function formatExcelPreviewText(
  name: string,
  preview: ExcelPreview,
): string {
  const lines: string[] = [
    `Excel file: ${name} — ${preview.totalSheets} sheet(s)`,
  ];
  for (const sheet of preview.sheets) {
    lines.push(
      `  Sheet "${sheet.name}": ${sheet.rowCount} rows, columns: ${sheet.columns.join(", ")}`,
    );
  }
  lines.push(
    `\nTo analyze this file, use the execute_python tool with fileUrl and fileName parameters.`,
  );
  return lines.join("\n");
}
