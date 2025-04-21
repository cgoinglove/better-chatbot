import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
// Maximum execution time in milliseconds
const EXECUTION_TIMEOUT = 30000; // 30 seconds
// Path to our Python virtual environment
const VENV_PATH = path.resolve(process.cwd(), "..", "venv");
const VENV_PYTHON = path.join(VENV_PATH, "Scripts", "python.exe");
// Path to the Node.js executable (use current process executable)
const NODE_PATH = process.execPath;
// Path to the direct sandbox implementation
const DIRECT_SANDBOX_PATH = path.resolve(process.cwd(), "..", "src", "llm-sandbox", "direct_sandbox.py");
/**
 * Execute code securely using the LLM Sandbox
 * @param code The code to execute
 * @param language The programming language (currently supports Python and JavaScript)
 * @returns Result of the execution
 */
export async function executeCodeSecurely(code, language) {
    const lowerCaseLanguage = language.toLowerCase();
    // Check supported languages for sandbox
    if (lowerCaseLanguage !== "python" && lowerCaseLanguage !== "javascript") {
        return {
            success: false,
            error: `Sandbox currently only supports Python and JavaScript. For ${language}, use the standard executor.`,
        };
    }
    try {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-sandbox-"));
        const fileExtension = lowerCaseLanguage === "python" ? "py" : "js";
        const scriptPath = path.join(tempDir, `code_to_execute.${fileExtension}`);
        // Write the code to execute to a temporary file
        fs.writeFileSync(scriptPath, code);
        const startTime = Date.now();
        // Execute the code in the appropriate sandbox
        let result;
        if (lowerCaseLanguage === "python") {
            result = await executeDirectSandbox(scriptPath);
        }
        else if (lowerCaseLanguage === "javascript") {
            result = await executeJavaScriptSandbox(scriptPath);
        }
        const executionTime = Date.now() - startTime;
        // Clean up temporary file
        try {
            // Only attempt to delete the file if it exists and is accessible
            if (fs.existsSync(scriptPath)) {
                try {
                    fs.unlinkSync(scriptPath);
                }
                catch (error) {
                    console.error("Error cleaning up script file:", error);
                }
            }
            // Only attempt to remove the directory if it exists and is accessible
            if (fs.existsSync(tempDir)) {
                try {
                    fs.rmdirSync(tempDir);
                }
                catch (error) {
                    console.error("Error cleaning up temporary directory:", error);
                }
            }
        }
        catch (error) {
            console.error("Error checking file/directory existence:", error);
        }
        return {
            success: result.success,
            output: result.output,
            error: result.error,
            executionTime,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: errorMessage,
        };
    }
}
/**
 * Execute the direct sandbox implementation with the provided code file
 * @param codePath Path to the Python code file to execute
 * @returns Execution result
 */
async function executeDirectSandbox(codePath) {
    return new Promise((resolve) => {
        // Create a temporary script to use the direct sandbox
        const tempScript = path.join(os.tmpdir(), `sandbox-runner-${Date.now()}.py`);
        const scriptContent = `
import sys
import os

# Load the direct sandbox module
sys.path.insert(0, os.path.dirname(r"${DIRECT_SANDBOX_PATH.replace(/\\/g, "\\\\")}")
)
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
`;
        fs.writeFileSync(tempScript, scriptContent);
        let output = "";
        let errorOutput = "";
        let isTimedOut = false;
        // Spawn the process
        let childProcess;
        try {
            childProcess = spawn(VENV_PYTHON, [tempScript], {
                stdio: ["ignore", "pipe", "pipe"],
            });
        }
        catch (err) {
            try {
                // Only attempt to delete the file if it exists and is accessible
                if (fs.existsSync(tempScript)) {
                    try {
                        fs.unlinkSync(tempScript);
                    }
                    catch (cleanupError) {
                        console.error("Error cleaning up temporary script:", cleanupError);
                    }
                }
            }
            catch (error) {
                // Handle errors from existsSync itself
                console.error("Error checking temporary script existence:", error);
            }
            return resolve({
                success: false,
                error: `Failed to spawn process: ${err.message}`,
            });
        }
        // Set up timeout
        const timeoutId = setTimeout(() => {
            isTimedOut = true;
            childProcess.kill();
            try {
                // Only attempt to delete the file if it exists and is accessible
                if (fs.existsSync(tempScript)) {
                    try {
                        fs.unlinkSync(tempScript);
                    }
                    catch (error) {
                        console.error("Error cleaning up temporary script:", error);
                    }
                }
            }
            catch (error) {
                // Handle errors from existsSync itself
                console.error("Error checking temporary script existence:", error);
            }
            resolve({
                success: false,
                error: `Execution timed out after ${EXECUTION_TIMEOUT / 1000} seconds`,
            });
        }, EXECUTION_TIMEOUT);
        // Collect stdout
        childProcess.stdout.on("data", (data) => {
            output += data.toString();
        });
        // Collect stderr
        childProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });
        // Handle process completion
        childProcess.on("close", (code) => {
            clearTimeout(timeoutId);
            try {
                // Only attempt to delete the file if it exists and is accessible
                if (fs.existsSync(tempScript)) {
                    try {
                        fs.unlinkSync(tempScript);
                    }
                    catch (error) {
                        console.error("Error cleaning up temporary script:", error);
                    }
                }
            }
            catch (error) {
                // Handle errors from existsSync itself
                console.error("Error checking temporary script existence:", error);
            }
            if (isTimedOut) {
                return; // Already resolved in the timeout handler
            }
            if (code === 0) {
                // Parse the output to extract success and actual output
                const successMatch = output.match(/success: (True|False)/);
                const success = successMatch ? successMatch[1] === "True" : false;
                // Extract the actual output between markers
                let actualOutput = "";
                const outputStartIndex = output.indexOf("--- OUTPUT START ---") + 20;
                const outputEndIndex = output.indexOf("--- OUTPUT END ---");
                if (outputStartIndex >= 20 && outputEndIndex > outputStartIndex) {
                    actualOutput = output
                        .substring(outputStartIndex, outputEndIndex)
                        .trim();
                }
                resolve({
                    success,
                    output: actualOutput,
                });
            }
            else {
                resolve({
                    success: false,
                    output: output.trim(),
                    error: errorOutput.trim() || `Process exited with code ${code}`,
                });
            }
        });
        // Handle process errors
        childProcess.on("error", (err) => {
            clearTimeout(timeoutId);
            try {
                // Only attempt to delete the file if it exists and is accessible
                if (fs.existsSync(tempScript)) {
                    try {
                        fs.unlinkSync(tempScript);
                    }
                    catch (error) {
                        console.error("Error cleaning up temporary script:", error);
                    }
                }
            }
            catch (error) {
                // Handle errors from existsSync itself
                console.error("Error checking temporary script existence:", error);
            }
            resolve({ success: false, error: `Failed to execute: ${err.message}` });
        });
    });
}
/**
 * Execute JavaScript code in a sandbox environment
 * @param scriptPath Path to the JavaScript file to execute
 * @returns Execution result
 */
async function executeJavaScriptSandbox(scriptPath) {
    return new Promise((resolve) => {
        // Create a wrapper script that handles browser APIs safely
        const wrapperScriptPath = path.join(os.tmpdir(), `js-sandbox-wrapper-${Date.now()}.js`);
        const wrapperContent = `
// Sandbox wrapper for JavaScript execution
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Create a safe sandbox context
const sandbox = {
  console: {
    log: (...args) => {
      output.push(...args.map(arg => String(arg)));
    },
    error: (...args) => {
      errors.push(...args.map(arg => String(arg)));
    },
    warn: (...args) => {
      output.push(...args.map(arg => '⚠️ ' + String(arg)));
    },
    info: (...args) => {
      output.push(...args.map(arg => String(arg)));
    }
  },
  // Safe versions of these globals
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  // Mock browser objects
  window: { },
  document: {
    addEventListener: (event, handler) => {
      console.log(\`[DOM Event Listener] Would attach \${event} event\`);
    },
    getElementById: (id) => {
      console.log(\`[DOM API] Would get element by ID: \${id}\`);
      return {
        addEventListener: (event, handler) => {
          console.log(\`[DOM Event Listener] Would attach \${event} event to #\${id}\`);
        }
      };
    },
    createElement: (tag) => {
      console.log(\`[DOM API] Would create element: \${tag}\`);
      return {};
    },
    // Add more mock DOM methods as needed
  },
  // Allow modules to be imported
  require: require,
  // Buffer for completeness
  Buffer: Buffer,
  process: {
    env: {},
    // Limited process info
    version: process.version,
    platform: process.platform,
    arch: process.arch
  }
};

// Arrays to collect output
const output = [];
const errors = [];

try {
  // Read the code
  const code = fs.readFileSync('${scriptPath.replace(/\\/g, "\\\\")}', 'utf8');

  // Create a script context
  const script = new vm.Script(code, {
    filename: 'sandbox.js',
    timeout: 5000  // 5 second timeout for script execution
  });

  // Run the script in the sandbox context
  const context = vm.createContext(sandbox);
  script.runInContext(context);

  // Print the results
  console.log("\\n--- SANDBOX EXECUTION RESULT ---");
  console.log("success: true");
  console.log("--- OUTPUT START ---");
  console.log(output.join('\\n'));
  console.log("--- OUTPUT END ---");
  console.log("--- ERRORS START ---");
  console.log(errors.join('\\n'));
  console.log("--- ERRORS END ---");

  process.exit(0);
} catch (error) {
  console.log("\\n--- SANDBOX EXECUTION RESULT ---");
  console.log("success: false");
  console.log("--- OUTPUT START ---");
  console.log(output.join('\\n'));
  console.log("--- OUTPUT END ---");
  console.log("--- ERRORS START ---");
  console.log(String(error));
  console.log(errors.join('\\n'));
  console.log("--- ERRORS END ---");

  process.exit(1);
}
`;
        fs.writeFileSync(wrapperScriptPath, wrapperContent);
        let output = "";
        let errorOutput = "";
        let isTimedOut = false;
        // Spawn the process to run the JS wrapper using absolute path to Node.js
        let childProcess;
        try {
            // Use NODE_PATH instead of "node"
            childProcess = spawn(NODE_PATH, [wrapperScriptPath], {
                stdio: ["ignore", "pipe", "pipe"],
            });
        }
        catch (err) {
            try {
                // Only attempt to delete the file if it exists and is accessible
                if (fs.existsSync(wrapperScriptPath)) {
                    try {
                        fs.unlinkSync(wrapperScriptPath);
                    }
                    catch (e) {
                        console.error("Error cleaning up wrapper script:", e);
                    }
                }
            }
            catch (e) {
                // Handle errors from existsSync itself
                console.error("Error checking wrapper script existence:", e);
            }
            return resolve({
                success: false,
                error: `Failed to spawn JavaScript sandbox: ${err.message}`,
            });
        }
        // Set up timeout
        const timeoutId = setTimeout(() => {
            isTimedOut = true;
            childProcess.kill();
            try {
                // Only attempt to delete the file if it exists and is accessible
                if (fs.existsSync(wrapperScriptPath)) {
                    try {
                        fs.unlinkSync(wrapperScriptPath);
                    }
                    catch (error) {
                        console.error("Error cleaning up wrapper script:", error);
                    }
                }
            }
            catch (error) {
                // Handle errors from existsSync itself
                console.error("Error checking wrapper script existence:", error);
            }
            resolve({
                success: false,
                error: `JavaScript execution timed out after ${EXECUTION_TIMEOUT / 1000} seconds`,
            });
        }, EXECUTION_TIMEOUT);
        // Collect stdout
        childProcess.stdout.on("data", (data) => {
            output += data.toString();
        });
        // Collect stderr
        childProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });
        // Handle process completion
        childProcess.on("close", (code) => {
            clearTimeout(timeoutId);
            try {
                // Only attempt to delete the file if it exists and is accessible
                if (fs.existsSync(wrapperScriptPath)) {
                    try {
                        fs.unlinkSync(wrapperScriptPath);
                    }
                    catch (error) {
                        console.error("Error cleaning up wrapper script:", error);
                    }
                }
            }
            catch (error) {
                // Handle errors from existsSync itself
                console.error("Error checking wrapper script existence:", error);
            }
            if (isTimedOut) {
                return; // Already resolved in the timeout handler
            }
            // Parse the output format (same as Python for consistency)
            const successMatch = output.match(/success: (true|false)/i);
            const success = successMatch
                ? successMatch[1].toLowerCase() === "true"
                : false;
            // Extract the actual output between markers
            let actualOutput = "";
            const outputStartIndex = output.indexOf("--- OUTPUT START ---") + 20;
            const outputEndIndex = output.indexOf("--- OUTPUT END ---");
            if (outputStartIndex >= 20 && outputEndIndex > outputStartIndex) {
                actualOutput = output
                    .substring(outputStartIndex, outputEndIndex)
                    .trim();
            }
            // Extract errors if any
            let actualError = "";
            const errorStartIndex = output.indexOf("--- ERRORS START ---") + 20;
            const errorEndIndex = output.indexOf("--- ERRORS END ---");
            if (errorStartIndex >= 20 && errorEndIndex > errorStartIndex) {
                actualError = output.substring(errorStartIndex, errorEndIndex).trim();
            }
            if (errorOutput) {
                actualError = actualError
                    ? `${actualError}\n${errorOutput}`
                    : errorOutput;
            }
            resolve({
                success,
                output: actualOutput,
                error: actualError ||
                    (code !== 0 ? `Process exited with code ${code}` : undefined),
            });
        });
        // Handle process errors with proper file cleanup
        childProcess.on("error", (err) => {
            clearTimeout(timeoutId);
            try {
                // Only attempt to delete the file if it exists and is accessible
                if (fs.existsSync(wrapperScriptPath)) {
                    try {
                        fs.unlinkSync(wrapperScriptPath);
                    }
                    catch (e) {
                        console.error("Error cleaning up wrapper script:", e);
                    }
                }
            }
            catch (e) {
                // Handle errors from existsSync itself
                console.error("Error checking wrapper script existence:", e);
            }
            resolve({
                success: false,
                error: `Failed to execute JavaScript: ${err.message}`,
            });
        });
    });
}
