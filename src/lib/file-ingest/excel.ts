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
  fileUrl?: string,
): string {
  const lines: string[] = [
    `<uploaded_file>`,
    `filename: ${name}`,
    `type: Excel (${preview.totalSheets} sheet${preview.totalSheets !== 1 ? "s" : ""})`,
  ];
  if (fileUrl) {
    lines.push(`fileUrl: ${fileUrl}`);
  }
  lines.push(`sheets:`);
  for (const sheet of preview.sheets) {
    lines.push(
      `  - "${sheet.name}": ${sheet.rowCount} rows | columns: ${sheet.columns.join(", ")}`,
    );
  }
  if (fileUrl) {
    lines.push(
      `\nIMPORTANT: To analyze this file, call execute_python with fileUrl="${fileUrl}" and fileName="${name}". The file will be available at /home/user/${name}.`,
    );
  }
  lines.push(`</uploaded_file>`);
  return lines.join("\n");
}
