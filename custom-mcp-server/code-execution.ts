import { spawn } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { executeCodeSecurely } from "./code-execution-sandbox.js";

// Define supported languages and their execution configurations
type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "shell"
  | "powershell"
  | "batch";

interface LanguageConfig {
  extension: string;
  command: string;
  args: string[];
}

const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  javascript: {
    extension: "js",
    command: "node",
    args: [],
  },
  typescript: {
    extension: "ts",
    command: "npx",
    args: ["ts-node"],
  },
  python: {
    extension: "py",
    command: "python",
    args: [],
  },
  shell: {
    extension: "sh",
    command: "bash",
    args: [],
  },
  powershell: {
    extension: "ps1",
    command: "powershell",
    args: ["-ExecutionPolicy", "Bypass", "-File"],
  },
  batch: {
    extension: "bat",
    command: "cmd",
    args: ["/c"],
  },
};

// Maximum execution time in milliseconds
const EXECUTION_TIMEOUT = 30000; // 30 seconds

// Maximum output size in bytes
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

// Create a temporary directory for code execution
const TEMP_DIR = path.join(os.tmpdir(), "mcp-code-execution");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Flags to control whether to use the sandbox for different languages
// These can be set via environment variables or configuration
const USE_SANDBOX_FOR_PYTHON = true;
const USE_SANDBOX_FOR_JAVASCRIPT = true;

/**
 * Execute code in a specified language
 * @param code The code to execute
 * @param language The programming language
 * @returns Result of the execution
 */
export async function executeCode(
  code: string,
  language: string,
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}> {
  // Check if language is supported
  const lowerCaseLanguage = language.toLowerCase() as SupportedLanguage;
  const langConfig = SUPPORTED_LANGUAGES[lowerCaseLanguage];
  if (!langConfig) {
    return {
      success: false,
      error: `Unsupported language: ${language}. Supported languages are: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}`,
    };
  }

  // Detect browser-specific code in JavaScript and use sandbox if enabled
  if (lowerCaseLanguage === "javascript") {
    const containsBrowserCode =
      code.includes("document") || code.includes("window");

    if (containsBrowserCode || USE_SANDBOX_FOR_JAVASCRIPT) {
      return executeCodeSecurely(code, language);
    }
  }

  // Use the secure sandbox for Python code if enabled
  if (lowerCaseLanguage === "python" && USE_SANDBOX_FOR_PYTHON) {
    return executeCodeSecurely(code, language);
  }

  // For other languages or if sandbox is disabled, use the original execution method
  return executeCodeUnsandboxed(code, lowerCaseLanguage, langConfig);
}

/**
 * Execute code using the original unsandboxed method
 * @param code The code to execute
 * @param language The programming language
 * @param langConfig The language configuration
 * @returns Result of the execution
 */
async function executeCodeUnsandboxed(
  code: string,
  language: SupportedLanguage,
  langConfig: LanguageConfig,
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}> {
  // Create a unique filename for this execution
  const fileId = crypto.randomBytes(16).toString("hex");
  const filename = `${fileId}.${langConfig.extension}`;
  const filePath = path.join(TEMP_DIR, filename);

  try {
    // Write code to temporary file
    fs.writeFileSync(filePath, code);

    // Prepare command and arguments
    const command = langConfig.command;
    const args = [...langConfig.args];

    // Add the file path to the arguments
    args.push(filePath);

    // Start timing execution
    const startTime = Date.now();

    // Execute the code
    const result = await executeCommand(command, args, TEMP_DIR);

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Clean up temporary file
    try {
      // Only attempt to delete the file if it exists and is accessible
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error("Error cleaning up temporary file:", error);
        }
      }
    } catch (error) {
      // Handle errors from existsSync itself
      console.error("Error checking temporary file existence:", error);
    }

    return {
      success: !result.error,
      output: result.output,
      error: result.error,
      executionTime,
    };
  } catch (error: unknown) {
    // Clean up temporary file in case of error
    try {
      // Only attempt to delete the file if it exists and is accessible
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error("Error cleaning up temporary file:", cleanupError);
        }
      }
    } catch (error) {
      // Handle errors from existsSync itself
      console.error("Error checking temporary file existence:", error);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Execute a command with timeout and output limits
 * @param command The command to execute
 * @param args Command arguments
 * @param cwd Working directory
 * @returns Command execution result
 */
async function executeCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ output?: string; error?: string }> {
  return new Promise((resolve) => {
    let output = "";
    let errorOutput = "";
    let isTimedOut = false;

    // Spawn the process
    let childProcess: ReturnType<typeof spawn>;
    try {
      childProcess = spawn(command, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true, // Use shell to help find executables
      });
    } catch (err: any) {
      return resolve({ error: `Failed to spawn process: ${err.message}` });
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      childProcess.kill();
      resolve({
        error: `Execution timed out after ${EXECUTION_TIMEOUT / 1000} seconds`,
      });
    }, EXECUTION_TIMEOUT);

    // Collect stdout
    childProcess.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString();
      if (output.length + chunk.length <= MAX_OUTPUT_SIZE) {
        output += chunk;
      } else if (output.length < MAX_OUTPUT_SIZE) {
        output =
          output.substring(0, MAX_OUTPUT_SIZE) +
          "\n... [Output truncated due to size limit]";
      }
    });

    // Collect stderr
    childProcess.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      if (errorOutput.length + chunk.length <= MAX_OUTPUT_SIZE) {
        errorOutput += chunk;
      } else if (errorOutput.length < MAX_OUTPUT_SIZE) {
        errorOutput =
          errorOutput.substring(0, MAX_OUTPUT_SIZE) +
          "\n... [Error output truncated due to size limit]";
      }
    });

    // Handle process completion
    childProcess.on("close", (code: number | null) => {
      clearTimeout(timeoutId);

      if (isTimedOut) {
        return; // Already resolved in the timeout handler
      }

      if (code === 0) {
        resolve({
          output: output.trim(),
        });
      } else {
        const errorMsg =
          errorOutput.trim() || `Process exited with code ${code}`;
        resolve({
          output: output.trim(),
          error: errorMsg,
        });
      }
    });

    // Handle process errors
    childProcess.on("error", (err: Error) => {
      clearTimeout(timeoutId);
      resolve({ error: `Failed to execute: ${err.message}` });
    });
  });
}
