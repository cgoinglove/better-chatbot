"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCode = executeCode;
var child_process_1 = require("child_process");
var crypto = require("crypto");
var fs = require("fs");
var os = require("os");
var path = require("path");
var code_execution_sandbox_js_1 = require("./code-execution-sandbox.js");
var SUPPORTED_LANGUAGES = {
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
var EXECUTION_TIMEOUT = 30000; // 30 seconds
// Maximum output size in bytes
var MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB
// Create a temporary directory for code execution
var TEMP_DIR = path.join(os.tmpdir(), "mcp-code-execution");
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
// Flag to control whether to use the sandbox for Python code
// This can be set via environment variable or configuration
var USE_SANDBOX_FOR_PYTHON = true;
/**
 * Execute code in a specified language
 * @param code The code to execute
 * @param language The programming language
 * @returns Result of the execution
 */
function executeCode(code, language) {
    return __awaiter(this, void 0, void 0, function () {
        var lowerCaseLanguage, langConfig;
        return __generator(this, function (_a) {
            lowerCaseLanguage = language.toLowerCase();
            langConfig = SUPPORTED_LANGUAGES[lowerCaseLanguage];
            if (!langConfig) {
                return [2 /*return*/, {
                        success: false,
                        error: "Unsupported language: ".concat(language, ". Supported languages are: ").concat(Object.keys(SUPPORTED_LANGUAGES).join(", ")),
                    }];
            }
            // Use the secure sandbox for Python code if enabled
            if (lowerCaseLanguage === "python" && USE_SANDBOX_FOR_PYTHON) {
                return [2 /*return*/, (0, code_execution_sandbox_js_1.executeCodeSecurely)(code, language)];
            }
            // For other languages or if sandbox is disabled, use the original execution method
            return [2 /*return*/, executeCodeUnsandboxed(code, lowerCaseLanguage, langConfig)];
        });
    });
}
/**
 * Execute code using the original unsandboxed method
 * @param code The code to execute
 * @param language The programming language
 * @param langConfig The language configuration
 * @returns Result of the execution
 */
function executeCodeUnsandboxed(code, language, langConfig) {
    return __awaiter(this, void 0, void 0, function () {
        var fileId, filename, filePath, command, args, startTime, result, executionTime, error_1, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileId = crypto.randomBytes(16).toString("hex");
                    filename = "".concat(fileId, ".").concat(langConfig.extension);
                    filePath = path.join(TEMP_DIR, filename);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // Write code to temporary file
                    fs.writeFileSync(filePath, code);
                    command = langConfig.command;
                    args = __spreadArray([], langConfig.args, true);
                    // Add the file path to the arguments
                    args.push(filePath);
                    startTime = Date.now();
                    return [4 /*yield*/, executeCommand(command, args, TEMP_DIR)];
                case 2:
                    result = _a.sent();
                    executionTime = Date.now() - startTime;
                    // Clean up temporary file
                    try {
                        fs.unlinkSync(filePath);
                    }
                    catch (error) {
                        console.error("Error cleaning up temporary file:", error);
                    }
                    return [2 /*return*/, {
                            success: !result.error,
                            output: result.output,
                            error: result.error,
                            executionTime: executionTime,
                        }];
                case 3:
                    error_1 = _a.sent();
                    // Clean up temporary file in case of error
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                    catch (cleanupError) {
                        console.error("Error cleaning up temporary file:", cleanupError);
                    }
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: errorMessage,
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute a command with timeout and output limits
 * @param command The command to execute
 * @param args Command arguments
 * @param cwd Working directory
 * @returns Command execution result
 */
function executeCommand(command, args, cwd) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var output = "";
                    var errorOutput = "";
                    var isTimedOut = false;
                    // Spawn the process
                    var childProcess;
                    try {
                        childProcess = (0, child_process_1.spawn)(command, args, {
                            cwd: cwd,
                            stdio: ["ignore", "pipe", "pipe"],
                            shell: true, // Use shell to help find executables
                        });
                    }
                    catch (err) {
                        return resolve({ error: "Failed to spawn process: ".concat(err.message) });
                    }
                    // Set up timeout
                    var timeoutId = setTimeout(function () {
                        isTimedOut = true;
                        childProcess.kill();
                        resolve({
                            error: "Execution timed out after ".concat(EXECUTION_TIMEOUT / 1000, " seconds"),
                        });
                    }, EXECUTION_TIMEOUT);
                    // Collect stdout
                    childProcess.stdout.on("data", function (data) {
                        var chunk = data.toString();
                        if (output.length + chunk.length <= MAX_OUTPUT_SIZE) {
                            output += chunk;
                        }
                        else if (output.length < MAX_OUTPUT_SIZE) {
                            output =
                                output.substring(0, MAX_OUTPUT_SIZE) +
                                    "\n... [Output truncated due to size limit]";
                        }
                    });
                    // Collect stderr
                    childProcess.stderr.on("data", function (data) {
                        var chunk = data.toString();
                        if (errorOutput.length + chunk.length <= MAX_OUTPUT_SIZE) {
                            errorOutput += chunk;
                        }
                        else if (errorOutput.length < MAX_OUTPUT_SIZE) {
                            errorOutput =
                                errorOutput.substring(0, MAX_OUTPUT_SIZE) +
                                    "\n... [Error output truncated due to size limit]";
                        }
                    });
                    // Handle process completion
                    childProcess.on("close", function (code) {
                        clearTimeout(timeoutId);
                        if (isTimedOut) {
                            return; // Already resolved in the timeout handler
                        }
                        if (code === 0) {
                            resolve({ output: output.trim() });
                        }
                        else {
                            resolve({
                                output: output.trim(),
                                error: errorOutput.trim() || "Process exited with code ".concat(code),
                            });
                        }
                    });
                    // Handle process errors
                    childProcess.on("error", function (err) {
                        clearTimeout(timeoutId);
                        resolve({ error: "Failed to execute: ".concat(err.message) });
                    });
                })];
        });
    });
}
