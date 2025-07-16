import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

export const jsExecutionSchema: JSONSchema7 = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description:
        'JavaScript code executed inside async function context. Use top-level await directly - NO need for (async () => {...})(). Use console.log() for output, NOT return. Use await with Promises, NOT .then() chains. CRITICAL: When creating async functions for user requests, you MUST call them with await to ensure the code executor waits for all async operations to complete. Example: "async function solution() { const delay = ms => new Promise(r => setTimeout(r, ms)); await delay(1000); console.log(\\"done\\"); } await solution();" Without await, async functions will not complete properly. Use \\n for line breaks.',
    },
    input: {
      type: "object",
      description:
        "Input data passed as variables to your code. Each property becomes a variable you can use directly. Example: {name: 'Alice', age: 25} makes 'name' and 'age' variables available in your code.",
      properties: {},
      additionalProperties: true,
      default: {},
    },
  },
  required: ["code"],
};

export const jsExecutionTool = createTool({
  description: `Execute JavaScript code for calculations and data processing. Code runs in async function context - use console.log() for output, not return statements. No DOM/React/frameworks. Web Worker environment with Math, JSON, fetch, etc. For long delays/loops, set timeout to 30000. CRITICAL: When defining async functions, MUST call them with await to ensure completion. eg: "async function test() { await delay(1000); console.log('done'); } await test();"`,
  parameters: jsonSchemaToZod(jsExecutionSchema),
});
