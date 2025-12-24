import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

export const pythonExecutionSchema: JSONSchema7 = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: `Execute Python code in the user's browser via Pyodide.\n\nNetwork access: use pyodide.http.open_url for HTTP/HTTPS, not urllib/request/requests. CORS must allow the app origin.\nExample (CSV):\nfrom pyodide.http import open_url\nimport pandas as pd\nurl = 'https://example.com/data.csv'\ndf = pd.read_csv(open_url(url))\nprint(df.head())\n\nOutput capture:\npyodide.setStdout({\n  batched: (output: string) => {\n    const type = output.startsWith('data:image/png;base64') ? 'image' : 'data'\n    logs.push({ type: 'log', args: [{ type, value: output }] })\n  },\n})\npyodide.setStderr({\n  batched: (output: string) => {\n    logs.push({ type: 'error', args: [{ type: 'data', value: output }] })\n  },\n})`,
    },
  },
  required: ["code"],
};

export const pythonExecutionTool = createTool({
  description:
    "Execute Python code in the user's browser via Pyodide. Use pyodide.http.open_url for HTTP(S) downloads; CORS must allow the app origin.",
  inputSchema: jsonSchemaToZod(pythonExecutionSchema),
});
