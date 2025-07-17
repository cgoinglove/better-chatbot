import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

const codeDescription = `JavaScript code is placed inside an async function wrapper. Since you're already in an async context, you can use await and return directly.

Examples:
- \`
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
const id = generateUUID();
console.log(\`generated id => \${id}\`);
\`

- \`
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDelay() {
  console.log('start!');
  await delay(2000);
  console.log('2 seconds later!');
}

// MUST use await when calling async functions
await testDelay();
\`

CRITICAL: When creating async functions, you MUST call them with await to ensure completion:
❌ Wrong: testDelay(); (function won't complete)
✅ Correct: await testDelay(); (waits for completion)


Guidelines:
- Use console.log(), console.error(), console.warn() to show logs to users (recommended)
- Use return to return values (optional)
- Use \n line breaks for better code readability
- Define and execute functions to test actual behavior
- Available: Math, JSON, fetch, and basic JavaScript APIs (no DOM/React/frameworks)
- Don't create additional async function wrappers - you're already inside one

Your code executes as: \`"use strict"; return (async () => { YOUR_CODE })\``;

export const jsExecutionSchema: JSONSchema7 = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: codeDescription,
    },
  },
  required: ["code"],
};

export const jsExecutionTool = createTool({
  description: `Write and execute JavaScript code in the user's browser for calculations, simple coding tasks, algorithm testing, and code demonstrations. Use console.log() to display results and output to users. Available APIs: Math, JSON, fetch, and standard JavaScript (no DOM/React/frameworks). Useful for testing code snippets, solving problems, and showing how code works in practice.`,
  parameters: jsonSchemaToZod(jsExecutionSchema),
});
