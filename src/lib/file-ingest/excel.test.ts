import { describe, it, expect } from "vitest";
import { parseExcelPreview, formatExcelPreviewText } from "./excel";
import * as XLSX from "xlsx";

function makeExcelBuffer(
  sheets: Record<string, (string | number)[][]>,
): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

describe("parseExcelPreview", () => {
  it("returns sheet names, column headers, and row count", () => {
    const buf = makeExcelBuffer({
      Q1_Sales: [
        ["Date", "Region", "Revenue"],
        ["2025-01-01", "North", 1000],
        ["2025-01-02", "South", 2000],
      ],
      Summary: [["Total"], [3000]],
    });

    const preview = parseExcelPreview(buf);

    expect(preview.sheetNames).toEqual(["Q1_Sales", "Summary"]);
    expect(preview.sheets[0].name).toBe("Q1_Sales");
    expect(preview.sheets[0].columns).toEqual(["Date", "Region", "Revenue"]);
    expect(preview.sheets[0].rowCount).toBe(2);
  });
});

describe("formatExcelPreviewText", () => {
  it("formats preview as readable text for chat context", () => {
    const buf = makeExcelBuffer({
      Sales: [
        ["Date", "Amount"],
        ["2025-01-01", 100],
      ],
    });
    const preview = parseExcelPreview(buf);
    const text = formatExcelPreviewText("sales.xlsx", preview);

    expect(text).toContain("sales.xlsx");
    expect(text).toContain("Sales");
    expect(text).toContain("Date");
    expect(text).toContain("Amount");
  });

  it("includes fileUrl and IMPORTANT instruction when url provided", () => {
    const buf = makeExcelBuffer({
      Sheet1: [["Col"], [1]],
    });
    const preview = parseExcelPreview(buf);
    const url = "https://blob.vercel-storage.com/uploads/uuid-sales.xlsx";
    const text = formatExcelPreviewText("sales.xlsx", preview, url);

    expect(text).toContain(`fileUrl: ${url}`);
    expect(text).toContain("IMPORTANT");
    expect(text).toContain('fileUrl="');
    expect(text).toContain('fileName="sales.xlsx"');
  });
});
