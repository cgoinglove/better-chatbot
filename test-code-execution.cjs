// Test script for code execution using CommonJS
const path = require('path');
const fs = require('fs');

// Check if the code-execution.js file exists
const codeExecutionPath = path.join(__dirname, 'custom-mcp-server', 'code-execution.js');
console.log(`Checking for file: ${codeExecutionPath}`);
console.log(`File exists: ${fs.existsSync(codeExecutionPath)}`);

// Import the executeCode function
const { executeCode } = require('./custom-mcp-server/code-execution.js');

async function testCodeExecution() {
  console.log('Testing Python code execution...');
  
  const pythonCode = `
print("Hello from Python!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")
`;

  try {
    const result = await executeCode(pythonCode, 'python');
    console.log('Execution result:', result);
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

testCodeExecution();
