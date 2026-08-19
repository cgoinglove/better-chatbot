import { tool as createTool } from "ai";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

const codeDescription = `Python code executed in a secure E2B cloud sandbox (Jupyter kernel) with full filesystem and network access.

Preinstalled: pandas, numpy, matplotlib, and the common data-science stack.

Chat attachments are staged in /home/user before execution. Open an uploaded
file by the exact visible filename (for example, pd.read_csv('data.csv')). If
the name is uncertain, inspect os.listdir('/home/user'). Do not invent paths
such as /mnt/user-data/uploads.

CHARTS: use Python for reading, cleaning, and AGGREGATING data. For a standard
in-chat bar / line / pie chart, DON'T draw it with matplotlib — pass the
aggregated numbers to the native createBarChart / createLineChart /
createPieChart tool instead (interactive, themed, downloadable). Only render a
chart in Python (matplotlib) when the native chart can't express the request —
e.g. a Sankey/heatmap/custom figure, or a specific look the native chart lacks.

IMPORTANT — each execution is a FRESH sandbox: nothing persists between runs —
not installed packages, not imports, not variables (df, income_df, …). Put
imports, file loading, aggregation, and output in ONE self-contained block;
never reference a name defined in a previous run. For PDFs, put the install first, e.g.:
!pip install reportlab fpdf2
from fpdf import FPDF
pdf = FPDF(); pdf.add_page(); pdf.set_font("Helvetica", size=16); pdf.cell(0, 10, "Hello")
pdf.output("report.pdf")
(Use pure-Python PDF libs like reportlab or fpdf2. WeasyPrint/pdfkit need system libraries that aren't available here.)

Generating files for the user: save them to the working directory — every file written there (PDF, CSV, XLSX, PNG, …) is returned as a downloadable artifact after execution. Examples: plt.savefig('chart.pdf'); df.to_csv('data.csv'); pdf.output('report.pdf').

Rich outputs (matplotlib figures, DataFrame reprs) are captured automatically. Use print() for textual results.

Fallback note: if the cloud sandbox is unavailable, code may run in in-browser Pyodide where pip installs and file artifacts do NOT work and network needs pyodide.http.open_url — so file generation requires the cloud sandbox.`;

export const pythonExecutionSchema: JSONSchema7 = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: codeDescription,
    },
  },
  required: ["code"],
};

export const pythonExecutionTool = createTool({
  description: `Execute Python code in a secure E2B cloud sandbox with filesystem and network access.

Uploaded chat attachments are available in /home/user under their visible filenames. Read them by filename; never assume a /mnt/user-data/uploads path.

This is the PREFERRED tool for:
- Data analysis, computation, and cleaning/aggregating raw data (e.g. a CSV) into the numbers a chart needs
- GENERATING FILES the user can download: PDFs, CSV/Excel exports, images, reports

For a standard in-chat bar/line/pie chart, aggregate the data here, then hand the computed values to the native createBarChart/createLineChart/createPieChart tool — do NOT draw it with matplotlib. Reach for matplotlib only when the native chart can't express the request (custom figure like a Sankey/heatmap, or a look the native chart lacks), or when the user wants a downloadable image file.

To deliver a file, save it to the working directory (e.g. pdf.output('report.pdf'), df.to_csv('data.csv'), plt.savefig('chart.pdf')) — generated files are returned to the user as downloadable artifacts automatically.

Each run is a FRESH sandbox: installed packages, imports, AND variables (df, income_df, …) are gone next run. Keep imports, file loading, aggregation, and output in the SAME code block; never reference a name from a previous run. Use pure-Python PDF libraries (reportlab, fpdf2).

When the user asks to create a PDF or any document/file, use THIS tool — not external document or workbench integrations — unless the user explicitly names another integration.`,
  inputSchema: jsonSchemaToZod(pythonExecutionSchema),
});
