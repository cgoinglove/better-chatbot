// Test script for code execution sandbox

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compile TypeScript files
console.log("Compiling TypeScript files...");
try {
  execSync(
    "npx tsc code-execution-sandbox.ts --target es2017 --module commonjs --esModuleInterop",
    {
      cwd: path.join(__dirname, "custom-mcp-server"),
      stdio: "inherit",
    },
  );
} catch (error) {
  console.error("Compilation error:", error);
  process.exit(1);
}

// Load our sandbox module - we use dynamic import for ES modules
console.log("Loading sandbox module...");
const sandboxModule = await import(
  "./custom-mcp-server/code-execution-sandbox.js"
);
const { executeCodeSecurely } = sandboxModule;

// Test code with browser APIs
const testBrowserCode = `
// This includes browser-specific code that would normally fail in Node.js
document.addEventListener('keydown', function(event) {
  console.log('Key pressed:', event.key);
});

const button = document.getElementById('test-button');
if (button) {
  button.addEventListener('click', function() {
    console.log('Button clicked!');
  });
}

console.log('Hello from sandbox test!');
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled numbers:', doubled);
`;

// Execute the test code
console.log("Executing test code in sandbox...");
try {
  const result = await executeCodeSecurely(testBrowserCode, "javascript");
  console.log("Sandbox execution result:");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Error:", error);
}
