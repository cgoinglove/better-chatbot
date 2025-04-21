// Execute Python code using the execute-code.py script
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Execute Python code using the DirectSandbox
 * @param {string} code - The Python code to execute
 * @returns {Promise<object>} - The execution result
 */
async function executePythonCode(code) {
  return new Promise((resolve) => {
    // Create a temporary file for the code
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-sandbox-'));
    const codePath = path.join(tempDir, 'code_to_execute.py');
    
    // Write the code to the temporary file
    fs.writeFileSync(codePath, code);
    
    let output = '';
    let errorOutput = '';
    
    // Spawn the Python process
    const childProcess = spawn('python', ['execute-code.py', codePath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Collect stdout
    childProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Collect stderr
    childProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Handle process completion
    childProcess.on('close', (code) => {
      // Clean up temporary files
      try {
        fs.unlinkSync(codePath);
        fs.rmdirSync(tempDir);
      } catch (error) {
        console.error('Error cleaning up temporary files:', error);
      }
      
      // Parse the output to extract success and actual output
      const successMatch = output.match(/Success: (True|False)/);
      const success = successMatch ? successMatch[1] === 'True' : false;
      
      // Extract the actual output between markers
      let actualOutput = '';
      const outputStartIndex = output.indexOf('--------------------------------------------------') + 50;
      const outputEndIndex = output.lastIndexOf('--------------------------------------------------');
      
      if (outputStartIndex >= 50 && outputEndIndex > outputStartIndex) {
        actualOutput = output.substring(outputStartIndex, outputEndIndex).trim();
      }
      
      resolve({
        success,
        output: actualOutput,
        error: errorOutput || (code !== 0 ? `Process exited with code ${code}` : undefined)
      });
    });
    
    // Handle process errors
    childProcess.on('error', (err) => {
      // Clean up temporary files
      try {
        fs.unlinkSync(codePath);
        fs.rmdirSync(tempDir);
      } catch (error) {
        console.error('Error cleaning up temporary files:', error);
      }
      
      resolve({ 
        success: false, 
        error: `Failed to execute: ${err.message}` 
      });
    });
  });
}

// Test the code execution
async function runTest() {
  console.log('Testing Python code execution...');
  
  const pythonCode = `
print("Hello from Python!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")

# Try to import some standard libraries
import math
print(f"The square root of 16 is {math.sqrt(16)}")

import random
print(f"A random number between 1 and 100: {random.randint(1, 100)}")

# Test a simple function
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
`;

  try {
    console.log('Executing code...');
    const result = await executePythonCode(pythonCode);
    console.log('Execution result:', result);
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

runTest();
