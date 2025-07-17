import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

export const pythonExecutionSchema: JSONSchema7 = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description:
        "Python code to execute. Use print() for output. The last expression's value will be returned if possible. Supports module imports.",
    },
  },
  required: ["code"],
};

export const pythonExecutionTool = createTool({
  description:
    "Execute Python code for complex computations, data analysis, visualizations, file operations, etc. Uses Pyodide for browser execution. Output via print().",
  parameters: jsonSchemaToZod(pythonExecutionSchema),
});
