import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

export const pythonExecutionSchema: JSONSchema7 = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: `Execute Python code directly in the user's browser using Pyodide. Code runs client-side without server dependency.\n\nUse print() for output. Module imports are supported. The last expression's value will be returned if possible.\n\nOutput collection:\n// Set up stdout capture\npyodide.setStdout({\n  batched: (output: string) => {\n    const type = output.startsWith("data:image/png;base64")\n      ? "image"\n      : "data";\n    logs.push({ type: "log", args: [{ type, value: output }] });\n  },\n});\n\npyodide.setStderr({\n  batched: (output: string) => {\n    logs.push({ type: "error", args: [{ type: "data", value: output }] });\n  },\n});`,
    },
  },
  required: ["code"],
};

export const pythonExecutionTool = createTool({
  description:
    "Execute Python code directly in the user's browser using Pyodide. Code runs client-side without server dependency.",
  parameters: jsonSchemaToZod(pythonExecutionSchema),
});
