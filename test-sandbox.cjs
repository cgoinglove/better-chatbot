// Test script for code execution sandbox (CommonJS version)

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Compile TypeScript files with CommonJS output
console.log("Compiling TypeScript files with CommonJS output...");
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

// Load our sandbox module
console.log("Loading sandbox module...");
const {
  executeCodeSecurely,
} = require("./custom-mcp-server/code-execution-sandbox.js");

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
executeCodeSecurely(testBrowserCode, "javascript")
  .then((result) => {
    console.log("Sandbox execution result:");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error("Error:", error);
  });
