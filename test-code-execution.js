// Test script for code execution
import { executeCode } from "./custom-mcp-server/dist/code-execution.js";

async function testCodeExecution() {
  console.log("Testing Python code execution...");

  const pythonCode = `
print("Hello from Python!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")
`;

  try {
    const result = await executeCode(pythonCode, "python");
    console.log("Execution result:", result);
  } catch (error) {
    console.error("Execution failed:", error);
  }
}

testCodeExecution();
