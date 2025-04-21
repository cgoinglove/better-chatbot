// Test script for executeCodeSecurely using CommonJS
const sandbox = require('./custom-mcp-server/code-execution-sandbox.js');

async function testExecuteSecurely() {
  console.log('Testing Python code execution with executeCodeSecurely...');
  
  const pythonCode = `
print("Hello from Python!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")
`;

  try {
    console.log('Executing code...');
    const result = await sandbox.executeCodeSecurely(pythonCode, 'python');
    console.log('Execution result:', result);
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

testExecuteSecurely();
