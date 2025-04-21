// Test script for executing Python code using Node.js and child_process
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Path to the Python executable
const PYTHON_PATH = 'python';

// Path to the direct sandbox implementation
const DIRECT_SANDBOX_PATH = path.resolve(process.cwd(), 'src', 'llm-sandbox', 'direct_sandbox.py');

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
    
    // Create a temporary script to use the direct sandbox
    const tempScript = path.join(tempDir, `sandbox-runner.py`);
    const scriptContent = `
import sys
import os

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.dirname(r"${DIRECT_SANDBOX_PATH.replace(/\\/g, "\\\\")}"))

try:
    from direct_sandbox import DirectSandbox
    
    # Read the code to execute
    with open(r"${codePath.replace(/\\/g, "\\\\")}", "r") as f:
        code = f.read()
    
    # Create a sandbox and execute the code
    sandbox = DirectSandbox()
    result = sandbox.execute(code)
    
    # Print the result for capture
    print("\\n--- SANDBOX EXECUTION RESULT ---")
    print(f"success: {result.success}")
    print(f"exit_code: {result.exit_code}")
    print(f"--- OUTPUT START ---")
    print(result.output)
    print(f"--- OUTPUT END ---")
    print(f"--- ERRORS START ---")
    print(result.stderr)
    print(f"--- ERRORS END ---")
except Exception as e:
    print(f"Error: {e}")
`;
    
    fs.writeFileSync(tempScript, scriptContent);
    
    let output = '';
    let errorOutput = '';
    
    // Spawn the Python process
    const childProcess = spawn(PYTHON_PATH, [tempScript], {
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
        fs.unlinkSync(tempScript);
        fs.rmdirSync(tempDir);
      } catch (error) {
        console.error('Error cleaning up temporary files:', error);
      }
      
      if (code === 0) {
        // Parse the output to extract success and actual output
        const successMatch = output.match(/success: (True|False)/);
        const success = successMatch ? successMatch[1] === 'True' : false;
        
        // Extract the actual output between markers
        let actualOutput = '';
        const outputStartIndex = output.indexOf('--- OUTPUT START ---') + 20;
        const outputEndIndex = output.indexOf('--- OUTPUT END ---');
        
        if (outputStartIndex >= 20 && outputEndIndex > outputStartIndex) {
          actualOutput = output.substring(outputStartIndex, outputEndIndex).trim();
        }
        
        resolve({
          success,
          output: actualOutput
        });
      } else {
        resolve({
          success: false,
          output: output.trim(),
          error: errorOutput.trim() || `Process exited with code ${code}`
        });
      }
    });
    
    // Handle process errors
    childProcess.on('error', (err) => {
      // Clean up temporary files
      try {
        fs.unlinkSync(codePath);
        fs.unlinkSync(tempScript);
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
`;

  try {
    const result = await executePythonCode(pythonCode);
    console.log('Execution result:', result);
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

runTest();
