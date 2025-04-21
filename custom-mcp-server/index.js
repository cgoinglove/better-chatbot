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
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var zod_1 = require("zod");
var code_execution_js_1 = require("./code-execution.js");
// Create the server
var server = new mcp_js_1.McpServer({
    name: "custom-mcp-server",
    version: "0.0.1",
});
// Create the transport
var transport = new stdio_js_1.StdioServerTransport();
server.tool("get_weather", "Get the current weather at a location.", {
    latitude: zod_1.z.number(),
    longitude: zod_1.z.number(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var response, data;
    var latitude = _b.latitude, longitude = _b.longitude;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, fetch("https://api.open-meteo.com/v1/forecast?latitude=".concat(latitude, "&longitude=").concat(longitude, "&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto"))];
            case 1:
                response = _c.sent();
                return [4 /*yield*/, response.json()];
            case 2:
                data = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "The current temperature in ".concat(latitude, ", ").concat(longitude, " is ").concat(data.current.temperature_2m, "\u00B0C."),
                            },
                            {
                                type: "text",
                                text: "The sunrise in ".concat(latitude, ", ").concat(longitude, " is ").concat(data.daily.sunrise[0], " and the sunset is ").concat(data.daily.sunset[0], "."),
                            },
                        ],
                    }];
        }
    });
}); });
server.tool("message_notify_user", "Send a message to user without requiring a response.", {
    text: zod_1.z.string(),
    attachments: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var text = _b.text, attachments = _b.attachments;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: text }] }];
    });
}); });
server.tool("message_ask_user", "Ask user a question and wait for response.", {
    text: zod_1.z.string(),
    attachments: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    suggest_user_takeover: zod_1.z.enum(["none", "browser"]).optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var text = _b.text, attachments = _b.attachments, suggest_user_takeover = _b.suggest_user_takeover;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: text }] }];
    });
}); });
server.tool("file_read", "Read file content.", {
    file: zod_1.z.string(),
    start_line: zod_1.z.number().optional(),
    end_line: zod_1.z.number().optional(),
    sudo: zod_1.z.boolean().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var file = _b.file, start_line = _b.start_line, end_line = _b.end_line, sudo = _b.sudo;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "File read" }] }];
    });
}); });
server.tool("file_write", "Overwrite or append content to a file.", {
    file: zod_1.z.string(),
    content: zod_1.z.string(),
    append: zod_1.z.boolean().optional(),
    leading_newline: zod_1.z.boolean().optional(),
    trailing_newline: zod_1.z.boolean().optional(),
    sudo: zod_1.z.boolean().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var file = _b.file, content = _b.content, append = _b.append, leading_newline = _b.leading_newline, trailing_newline = _b.trailing_newline, sudo = _b.sudo;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "File written" }] }];
    });
}); });
server.tool("file_str_replace", "Replace specified string in a file.", {
    file: zod_1.z.string(),
    old_str: zod_1.z.string(),
    new_str: zod_1.z.string(),
    sudo: zod_1.z.boolean().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var file = _b.file, old_str = _b.old_str, new_str = _b.new_str, sudo = _b.sudo;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "String replaced" }] }];
    });
}); });
server.tool("file_find_in_content", "Search for matching text within file content.", {
    file: zod_1.z.string(),
    regex: zod_1.z.string(),
    sudo: zod_1.z.boolean().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var file = _b.file, regex = _b.regex, sudo = _b.sudo;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Content found" }] }];
    });
}); });
server.tool("file_find_by_name", "Find files by name pattern in specified directory.", {
    path: zod_1.z.string(),
    glob: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var path = _b.path, glob = _b.glob;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Files found" }] }];
    });
}); });
server.tool("shell_exec", "Execute commands in a specified shell session.", {
    id: zod_1.z.string(),
    exec_dir: zod_1.z.string(),
    command: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var id = _b.id, exec_dir = _b.exec_dir, command = _b.command;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Command executed" }] }];
    });
}); });
server.tool("shell_view", "View the content of a specified shell session.", {
    id: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var id = _b.id;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Shell content viewed" }] }];
    });
}); });
server.tool("shell_wait", "Wait for the running process in a specified shell session to return.", {
    id: zod_1.z.string(),
    seconds: zod_1.z.number().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var id = _b.id, seconds = _b.seconds;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Process completed" }] }];
    });
}); });
server.tool("shell_write_to_process", "Write input to a running process in a specified shell session.", {
    id: zod_1.z.string(),
    input: zod_1.z.string(),
    press_enter: zod_1.z.boolean(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var id = _b.id, input = _b.input, press_enter = _b.press_enter;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Input written" }] }];
    });
}); });
server.tool("shell_kill_process", "Terminate a running process in a specified shell session.", {
    id: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var id = _b.id;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Process killed" }] }];
    });
}); });
server.tool("browser_view", "View content of the current browser page.", {}, function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, { content: [{ type: "text", text: "Browser content viewed" }] }];
    });
}); });
server.tool("browser_navigate", "Navigate browser to specified URL.", {
    url: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var url = _b.url;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Navigated to URL" }] }];
    });
}); });
server.tool("browser_restart", "Restart browser and navigate to specified URL.", {
    url: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var url = _b.url;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Browser restarted" }] }];
    });
}); });
server.tool("browser_click", "Click on elements in the current browser page.", {
    index: zod_1.z.number().optional(),
    coordinate_x: zod_1.z.number().optional(),
    coordinate_y: zod_1.z.number().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var index = _b.index, coordinate_x = _b.coordinate_x, coordinate_y = _b.coordinate_y;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Element clicked" }] }];
    });
}); });
server.tool("browser_input", "Overwrite text in editable elements on the current browser page.", {
    index: zod_1.z.number().optional(),
    coordinate_x: zod_1.z.number().optional(),
    coordinate_y: zod_1.z.number().optional(),
    text: zod_1.z.string(),
    press_enter: zod_1.z.boolean(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var index = _b.index, coordinate_x = _b.coordinate_x, coordinate_y = _b.coordinate_y, text = _b.text, press_enter = _b.press_enter;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Text input complete" }] }];
    });
}); });
server.tool("browser_move_mouse", "Move cursor to specified position on the current browser page.", {
    coordinate_x: zod_1.z.number(),
    coordinate_y: zod_1.z.number(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var coordinate_x = _b.coordinate_x, coordinate_y = _b.coordinate_y;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Mouse moved" }] }];
    });
}); });
server.tool("browser_press_key", "Simulate key press in the current browser page.", {
    key: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var key = _b.key;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Key pressed" }] }];
    });
}); });
server.tool("browser_select_option", "Select specified option from dropdown list element in the current browser page.", {
    index: zod_1.z.number(),
    option: zod_1.z.number(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var index = _b.index, option = _b.option;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Option selected" }] }];
    });
}); });
server.tool("browser_scroll_up", "Scroll up the current browser page.", {
    to_top: zod_1.z.boolean().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var to_top = _b.to_top;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Scrolled up" }] }];
    });
}); });
server.tool("browser_scroll_down", "Scroll down the current browser page.", {
    to_bottom: zod_1.z.boolean().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var to_bottom = _b.to_bottom;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Scrolled down" }] }];
    });
}); });
server.tool("browser_console_exec", "Execute JavaScript code in browser console.", {
    javascript: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var javascript = _b.javascript;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "JavaScript executed" }] }];
    });
}); });
server.tool("browser_console_view", "View browser console output.", {
    max_lines: zod_1.z.number().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var max_lines = _b.max_lines;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Console output viewed" }] }];
    });
}); });
server.tool("info_search_web", "Search web pages using search engine.", {
    query: zod_1.z.string(),
    date_range: zod_1.z
        .enum([
        "all",
        "past_hour",
        "past_day",
        "past_week",
        "past_month",
        "past_year",
    ])
        .optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var query = _b.query, date_range = _b.date_range;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Web search completed" }] }];
    });
}); });
server.tool("deploy_expose_port", "Expose specified local port for temporary public access.", {
    port: zod_1.z.number(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var port = _b.port;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Port exposed" }] }];
    });
}); });
server.tool("deploy_apply_deployment", "Deploy website or application to public production environment.", {
    type: zod_1.z.enum(["static", "nextjs"]),
    local_dir: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var type = _b.type, local_dir = _b.local_dir;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Deployment applied" }] }];
    });
}); });
server.tool("make_manus_page", "Make a Manus Page from a local MDX file.", {
    mdx_file_path: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var mdx_file_path = _b.mdx_file_path;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "Manus page created" }] }];
    });
}); });
server.tool("code_execute", "Execute code in a specified programming language.", {
    code: zod_1.z.string(),
    language: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var result, error_1;
    var code = _b.code, language = _b.language;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, code_execution_js_1.executeCode)(code, language)];
            case 1:
                result = _c.sent();
                if (result.success) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Code executed successfully in ".concat(result.executionTime, "ms:\n\n").concat(result.output || "No output"),
                                },
                            ],
                            success: true,
                            output: result.output,
                            executionTime: result.executionTime,
                        }];
                }
                else {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error executing code: ".concat(result.error, "\n\n").concat(result.output ? "Output: ".concat(result.output) : ""),
                                },
                            ],
                            success: false,
                            error: result.error,
                            output: result.output,
                        }];
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to execute code: ".concat(error_1.message || String(error_1)),
                            },
                        ],
                        success: false,
                        error: error_1.message || String(error_1),
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Import Node.js modules at the top level
var child_process_1 = require("child_process");
var fs = require("fs");
var os = require("os");
var path = require("path");
server.tool("github_list_repositories", "List all GitHub repositories mounted in the system.", {}, function () { return __awaiter(void 0, void 0, void 0, function () {
    var isGitRepo_1, hasGitHubRemote_1, getRepoDetails_1, getCommonRepoLocations_1, getGitHubDesktopLocations_1, scanDirectoriesForRepos_1, scanLocalRepositories, repositories, responseText_1;
    return __generator(this, function (_a) {
        try {
            isGitRepo_1 = function (dirPath) {
                try {
                    return fs.existsSync(path.join(dirPath, ".git"));
                }
                catch (error) {
                    return false;
                }
            };
            hasGitHubRemote_1 = function (repoPath) {
                try {
                    var remotes = (0, child_process_1.execSync)("git remote -v", {
                        cwd: repoPath,
                        encoding: "utf8",
                    });
                    return remotes.includes("github.com");
                }
                catch (error) {
                    return false;
                }
            };
            getRepoDetails_1 = function (repoPath) {
                try {
                    var name_1 = path.basename(repoPath);
                    // Get remote URL
                    var remoteUrl = "";
                    try {
                        remoteUrl = (0, child_process_1.execSync)("git config --get remote.origin.url", {
                            cwd: repoPath,
                            encoding: "utf8",
                        }).trim();
                    }
                    catch (error) {
                        // No remote or not set
                    }
                    // Get current branch
                    var branch = "";
                    try {
                        branch = (0, child_process_1.execSync)("git rev-parse --abbrev-ref HEAD", {
                            cwd: repoPath,
                            encoding: "utf8",
                        }).trim();
                    }
                    catch (error) {
                        // Not on a branch
                    }
                    // Get last commit
                    var lastCommit = {};
                    try {
                        var commitInfo = (0, child_process_1.execSync)('git log -1 --pretty=format:"%h|%s|%cr"', { cwd: repoPath, encoding: "utf8" }).trim();
                        var _a = commitInfo.split("|"), hash = _a[0], message = _a[1], date = _a[2];
                        lastCommit = { hash: hash, message: message, date: date };
                    }
                    catch (error) {
                        // No commits
                    }
                    return {
                        name: name_1,
                        path: repoPath,
                        remote: remoteUrl,
                        branch: branch,
                        lastCommit: lastCommit,
                    };
                }
                catch (error) {
                    return null;
                }
            };
            getCommonRepoLocations_1 = function () {
                var homeDir = os.homedir();
                // Common locations based on operating system
                var locations = [
                    path.join(homeDir, "Documents"),
                    path.join(homeDir, "Projects"),
                    path.join(homeDir, "dev"),
                    path.join(homeDir, "Development"),
                    path.join(homeDir, "code"),
                    path.join(homeDir, "src"),
                    path.join(homeDir, "workspace"),
                ];
                // Add GitHub Desktop locations based on OS
                if (process.platform === "win32") {
                    locations.push(path.join(homeDir, "Documents", "GitHub"));
                    locations.push(path.join(homeDir, "source", "repos"));
                }
                else if (process.platform === "darwin") {
                    locations.push(path.join(homeDir, "Documents", "GitHub"));
                }
                else {
                    locations.push(path.join(homeDir, "GitHub"));
                }
                return locations.filter(function (loc) { return fs.existsSync(loc); });
            };
            getGitHubDesktopLocations_1 = function () {
                try {
                    var configPath = "";
                    // GitHub Desktop config location based on OS
                    if (process.platform === "win32") {
                        configPath = path.join(os.homedir(), "AppData", "Roaming", "GitHub Desktop", "repositories.json");
                    }
                    else if (process.platform === "darwin") {
                        configPath = path.join(os.homedir(), "Library", "Application Support", "GitHub Desktop", "repositories.json");
                    }
                    else {
                        configPath = path.join(os.homedir(), ".config", "GitHub Desktop", "repositories.json");
                    }
                    // Check if config file exists
                    if (!fs.existsSync(configPath)) {
                        return [];
                    }
                    // Read and parse config file
                    var configData = fs.readFileSync(configPath, "utf8");
                    var config = JSON.parse(configData);
                    // Extract repository paths
                    if (config && config.repositories) {
                        return config.repositories.map(function (repo) { return repo.path; });
                    }
                    return [];
                }
                catch (error) {
                    return [];
                }
            };
            scanDirectoriesForRepos_1 = function (directories, maxDepth) {
                if (maxDepth === void 0) { maxDepth = 2; }
                var repositories = [];
                var scanDirectory = function (dirPath, currentDepth) {
                    // Stop if we've reached max depth
                    if (currentDepth > maxDepth) {
                        return;
                    }
                    try {
                        // Check if current directory is a GitHub repository
                        if (isGitRepo_1(dirPath) && hasGitHubRemote_1(dirPath)) {
                            var repoInfo = getRepoDetails_1(dirPath);
                            if (repoInfo) {
                                repositories.push(repoInfo);
                            }
                            // Don't scan subdirectories of Git repositories
                            return;
                        }
                        // Scan subdirectories
                        var entries = fs.readdirSync(dirPath, { withFileTypes: true });
                        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                            var entry = entries_1[_i];
                            if (entry.isDirectory() && !entry.name.startsWith(".")) {
                                var subDirPath = path.join(dirPath, entry.name);
                                scanDirectory(subDirPath, currentDepth + 1);
                            }
                        }
                    }
                    catch (error) {
                        // Silently ignore permission errors
                    }
                };
                // Process each directory
                for (var _i = 0, directories_1 = directories; _i < directories_1.length; _i++) {
                    var dir = directories_1[_i];
                    scanDirectory(dir, 0);
                }
                return repositories;
            };
            scanLocalRepositories = function () {
                // Get common locations
                var commonLocations = getCommonRepoLocations_1();
                // Get GitHub Desktop locations
                var desktopLocations = getGitHubDesktopLocations_1();
                // Scan common locations
                var commonRepos = scanDirectoriesForRepos_1(commonLocations);
                // Process GitHub Desktop repositories
                var desktopRepos = [];
                for (var _i = 0, desktopLocations_1 = desktopLocations; _i < desktopLocations_1.length; _i++) {
                    var location_1 = desktopLocations_1[_i];
                    if (isGitRepo_1(location_1) && hasGitHubRemote_1(location_1)) {
                        var repoInfo = getRepoDetails_1(location_1);
                        if (repoInfo) {
                            repoInfo.isGitHubDesktop = true;
                            desktopRepos.push(repoInfo);
                        }
                    }
                }
                // Combine and deduplicate repositories
                var allRepos = __spreadArray(__spreadArray([], desktopRepos, true), commonRepos, true);
                var uniqueRepos = allRepos.filter(function (repo, index, self) {
                    return index === self.findIndex(function (r) { return r.path === repo.path; });
                });
                return uniqueRepos;
            };
            repositories = scanLocalRepositories();
            responseText_1 = "Found ".concat(repositories.length, " GitHub repositories:\n\n");
            if (repositories.length === 0) {
                responseText_1 = "No GitHub repositories found on this system.";
            }
            else {
                repositories.forEach(function (repo, index) {
                    responseText_1 += "".concat(index + 1, ". ").concat(repo.name, "\n");
                    responseText_1 += "   Path: ".concat(repo.path, "\n");
                    if (repo.remote)
                        responseText_1 += "   Remote: ".concat(repo.remote, "\n");
                    if (repo.branch)
                        responseText_1 += "   Branch: ".concat(repo.branch, "\n");
                    if (repo.lastCommit && repo.lastCommit.hash) {
                        responseText_1 += "   Last Commit: ".concat(repo.lastCommit.hash, " - ").concat(repo.lastCommit.message, " (").concat(repo.lastCommit.date, ")\n");
                    }
                    if (repo.isGitHubDesktop)
                        responseText_1 += "   Managed by GitHub Desktop\n";
                    responseText_1 += "\n";
                });
            }
            return [2 /*return*/, {
                    content: [
                        {
                            type: "text",
                            text: responseText_1,
                        },
                    ],
                    repositories: repositories,
                }];
        }
        catch (error) {
            return [2 /*return*/, {
                    content: [
                        {
                            type: "text",
                            text: "Error listing GitHub repositories: ".concat(error.message || String(error)),
                        },
                    ],
                    error: error.message || String(error),
                }];
        }
        return [2 /*return*/];
    });
}); });
server.tool("github_add_repository", "Add a local GitHub repository to the system.", {
    name: zod_1.z.string(),
    path: zod_1.z.string(),
    description: zod_1.z.string().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fs_1, execSync_1, nodePath, gitDir, hasGitHubRemote, remoteUrl, remotes, remoteMatch, branch, repoDescription, fetch_1, response, errorText, result, error_2;
    var name = _b.name, repoPath = _b.path, description = _b.description;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 9, , 10]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("fs"); })];
            case 1:
                fs_1 = (_c.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_1 = (_c.sent()).execSync;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("path"); })];
            case 3:
                nodePath = _c.sent();
                // Check if the path exists
                if (!fs_1.existsSync(repoPath)) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path does not exist: ".concat(repoPath),
                                },
                            ],
                            success: false,
                            error: "Path does not exist",
                        }];
                }
                gitDir = nodePath.join(repoPath, ".git");
                if (!fs_1.existsSync(gitDir)) {
                    return [2 /*return*/, {
                            content: [
                                { type: "text", text: "Not a Git repository: ".concat(repoPath) },
                            ],
                            success: false,
                            error: "Not a Git repository",
                        }];
                }
                hasGitHubRemote = false;
                remoteUrl = "";
                try {
                    remotes = execSync_1("git remote -v", {
                        cwd: repoPath,
                        encoding: "utf8",
                    });
                    hasGitHubRemote = remotes.includes("github.com");
                    if (hasGitHubRemote) {
                        remoteMatch = remotes.match(/origin\s+(https:\/\/github\.com\/[^\s]+|git@github\.com:[^\s]+)/);
                        remoteUrl = remoteMatch ? remoteMatch[1] : "";
                    }
                }
                catch (error) {
                    // Ignore errors
                }
                branch = "";
                try {
                    branch = execSync_1("git rev-parse --abbrev-ref HEAD", {
                        cwd: repoPath,
                        encoding: "utf8",
                    }).trim();
                }
                catch (error) {
                    // Ignore errors
                }
                repoDescription = description ||
                    "Local GitHub repository: ".concat(name, " (").concat(branch || "unknown branch", ")");
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 4:
                fetch_1 = (_c.sent()).default;
                return [4 /*yield*/, fetch_1("http://localhost:3000/api/github/add-local-repo", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            name: name,
                            repoPath: repoPath,
                            description: repoDescription,
                            remote: remoteUrl,
                        }),
                    })];
            case 5:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 7];
                return [4 /*yield*/, response.text()];
            case 6:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [
                            { type: "text", text: "Failed to add repository: ".concat(errorText) },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 7: return [4 /*yield*/, response.json()];
            case 8:
                result = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Successfully added GitHub repository: ".concat(name, "\nPath: ").concat(repoPath, "\nDescription: ").concat(repoDescription),
                            },
                        ],
                        success: true,
                        repository: result.repository,
                    }];
            case 9:
                error_2 = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error adding GitHub repository: ".concat(error_2.message),
                            },
                        ],
                        success: false,
                        error: error_2.message,
                    }];
            case 10: return [2 /*return*/];
        }
    });
}); });
server.tool("github_remove_repository", "Remove a GitHub repository from the system.", {
    id: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var id = _b.id;
    return __generator(this, function (_c) {
        return [2 /*return*/, { content: [{ type: "text", text: "GitHub repository removed" }] }];
    });
}); });
server.tool("github_pull_repository", "Pull the latest changes from the remote repository.", {
    repository_id: zod_1.z.string(),
    branch: zod_1.z.string().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_2, execSync_2, response, errorText, repo, command, output, errorMessage, error_3, errorMessage;
    var repository_id = _b.repository_id, branch = _b.branch;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_2 = (_c.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_2 = (_c.sent()).execSync;
                return [4 /*yield*/, fetch_2("http://localhost:3000/api/github/".concat(repository_id))];
            case 3:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                repo = _c.sent();
                if (!repo.path) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path not found for ID: ".concat(repository_id),
                                },
                            ],
                            success: false,
                            error: "Repository path not found",
                        }];
                }
                // Execute git pull command
                try {
                    command = "git pull";
                    if (branch) {
                        command = "git pull origin ".concat(branch);
                    }
                    output = execSync_2(command, {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Successfully pulled latest changes for ".concat(repo.name, ":\n\n").concat(output),
                                },
                            ],
                            success: true,
                            output: output,
                        }];
                }
                catch (error) {
                    errorMessage = error.message || String(error);
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error pulling repository: ".concat(errorMessage),
                                },
                            ],
                            success: false,
                            error: errorMessage,
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                error_3 = _c.sent();
                errorMessage = error_3.message || String(error_3);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error pulling repository: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_push_repository", "Push local changes to the remote repository.", {
    repository_id: zod_1.z.string(),
    branch: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_3, execSync_3, response, errorText, repo, statusOutput, pushCommand, output, errorMessage, error_4, errorMessage;
    var repository_id = _b.repository_id, branch = _b.branch, message = _b.message;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_3 = (_c.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_3 = (_c.sent()).execSync;
                return [4 /*yield*/, fetch_3("http://localhost:3000/api/github/".concat(repository_id))];
            case 3:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                repo = _c.sent();
                if (!repo.path) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path not found for ID: ".concat(repository_id),
                                },
                            ],
                            success: false,
                            error: "Repository path not found",
                        }];
                }
                // Check if there are changes to commit
                try {
                    statusOutput = execSync_3("git status --porcelain", {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    if (statusOutput.trim() === "") {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: "text",
                                        text: "No changes to commit in ".concat(repo.name),
                                    },
                                ],
                                success: true,
                                noChanges: true,
                            }];
                    }
                    // If there are changes and a commit message is provided, commit them
                    if (message) {
                        execSync_3("git add .", {
                            cwd: repo.path,
                            encoding: "utf8",
                            stdio: "pipe",
                        });
                        execSync_3("git commit -m \"".concat(message.replace(/"/g, '\\"'), "\""), {
                            cwd: repo.path,
                            encoding: "utf8",
                            stdio: "pipe",
                        });
                    }
                    pushCommand = "git push";
                    if (branch) {
                        pushCommand = "git push origin ".concat(branch);
                    }
                    output = execSync_3(pushCommand, {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Successfully pushed changes for ".concat(repo.name, ":\n\n").concat(output),
                                },
                            ],
                            success: true,
                            output: output,
                        }];
                }
                catch (error) {
                    errorMessage = error.message || String(error);
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error pushing repository: ".concat(errorMessage),
                                },
                            ],
                            success: false,
                            error: errorMessage,
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                error_4 = _c.sent();
                errorMessage = error_4.message || String(error_4);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error pushing repository: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_sync_repository", "Synchronize a repository by pulling and then pushing changes.", {
    repository_id: zod_1.z.string(),
    branch: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_4, execSync_4, response, errorText, repo, statusOutput, hasLocalChanges, pullCommand, pullOutput, pushOutput, pushCommand, error_5, errorMessage;
    var repository_id = _b.repository_id, branch = _b.branch, message = _b.message;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_4 = (_c.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_4 = (_c.sent()).execSync;
                return [4 /*yield*/, fetch_4("http://localhost:3000/api/github/".concat(repository_id))];
            case 3:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                repo = _c.sent();
                if (!repo.path) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path not found for ID: ".concat(repository_id),
                                },
                            ],
                            success: false,
                            error: "Repository path not found",
                        }];
                }
                statusOutput = execSync_4("git status --porcelain", {
                    cwd: repo.path,
                    encoding: "utf8",
                    stdio: "pipe",
                });
                hasLocalChanges = statusOutput.trim() !== "";
                // If there are changes and a commit message is provided, commit them
                if (hasLocalChanges && message) {
                    execSync_4("git add .", {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    execSync_4("git commit -m \"".concat(message.replace(/"/g, '\\"'), "\""), {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                }
                pullCommand = "git pull";
                if (branch) {
                    pullCommand = "git pull origin ".concat(branch);
                }
                pullOutput = void 0;
                try {
                    pullOutput = execSync_4(pullCommand, {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                }
                catch (pullError) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error pulling changes: ".concat(pullError.message, "\n\nPlease resolve conflicts manually."),
                                },
                            ],
                            success: false,
                            error: pullError.message,
                        }];
                }
                pushOutput = "";
                if (hasLocalChanges) {
                    pushCommand = "git push";
                    if (branch) {
                        pushCommand = "git push origin ".concat(branch);
                    }
                    try {
                        pushOutput = execSync_4(pushCommand, {
                            cwd: repo.path,
                            encoding: "utf8",
                            stdio: "pipe",
                        });
                    }
                    catch (pushError) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: "text",
                                        text: "Successfully pulled changes but error pushing: ".concat(pushError.message),
                                    },
                                ],
                                success: false,
                                pullSuccess: true,
                                pushError: pushError.message,
                            }];
                    }
                }
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Successfully synchronized ".concat(repo.name, ":\n\nPull:\n").concat(pullOutput, "\n\n").concat(hasLocalChanges ? "Push:\n".concat(pushOutput) : "No local changes to push."),
                            },
                        ],
                        success: true,
                        pullOutput: pullOutput,
                        pushOutput: hasLocalChanges ? pushOutput : null,
                        hadLocalChanges: hasLocalChanges,
                    }];
            case 7:
                error_5 = _c.sent();
                errorMessage = error_5.message || String(error_5);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error synchronizing repository: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_index_repository", "Index or re-index a GitHub repository.", {
    id: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_5, response, errorText, result, error_6, errorMessage;
    var id = _b.id;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 6, , 7]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_5 = (_c.sent()).default;
                return [4 /*yield*/, fetch_5("http://localhost:3000/api/github/".concat(id, "/index"), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })];
            case 2:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, response.text()];
            case 3:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [
                            { type: "text", text: "Failed to index repository: ".concat(errorText) },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 4: return [4 /*yield*/, response.json()];
            case 5:
                result = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Successfully indexed repository: ".concat(result.indexedCount, " files indexed"),
                            },
                        ],
                        success: true,
                        indexedCount: result.indexedCount,
                    }];
            case 6:
                error_6 = _c.sent();
                errorMessage = error_6.message || String(error_6);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error indexing GitHub repository: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 7: return [2 /*return*/];
        }
    });
}); });
server.tool("github_list_branches", "List all branches in a GitHub repository.", {
    repository_id: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_6, execSync_5, response, errorText, repo, localBranchesOutput, remoteBranchesOutput, localBranches, remoteBranches, allBranches, branchNames, _i, localBranches_1, branch, _c, remoteBranches_1, branch, responseText_2, currentBranch, otherBranches, errorMessage, error_7, errorMessage;
    var repository_id = _b.repository_id;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_6 = (_d.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_5 = (_d.sent()).execSync;
                return [4 /*yield*/, fetch_6("http://localhost:3000/api/github/".concat(repository_id))];
            case 3:
                response = _d.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                repo = _d.sent();
                if (!repo.path) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path not found for ID: ".concat(repository_id),
                                },
                            ],
                            success: false,
                            error: "Repository path not found",
                        }];
                }
                // Get all branches
                try {
                    localBranchesOutput = execSync_5("git branch", {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    remoteBranchesOutput = execSync_5("git branch -r", {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    localBranches = localBranchesOutput
                        .split("\n")
                        .map(function (branch) { return branch.trim(); })
                        .filter(function (branch) { return branch; })
                        .map(function (branch) {
                        var isCurrent = branch.startsWith("*");
                        var name = isCurrent ? branch.substring(1).trim() : branch;
                        return { name: name, isCurrent: isCurrent, isLocal: true };
                    });
                    remoteBranches = remoteBranchesOutput
                        .split("\n")
                        .map(function (branch) { return branch.trim(); })
                        .filter(function (branch) { return branch; })
                        .map(function (branch) {
                        // Remove 'origin/' prefix
                        var name = branch.startsWith("origin/")
                            ? branch.substring(7)
                            : branch;
                        return { name: name, isCurrent: false, isRemote: true };
                    });
                    allBranches = [];
                    branchNames = new Set();
                    // Add local branches first
                    for (_i = 0, localBranches_1 = localBranches; _i < localBranches_1.length; _i++) {
                        branch = localBranches_1[_i];
                        allBranches.push(branch);
                        branchNames.add(branch.name);
                    }
                    // Add remote branches that don't have a local counterpart
                    for (_c = 0, remoteBranches_1 = remoteBranches; _c < remoteBranches_1.length; _c++) {
                        branch = remoteBranches_1[_c];
                        if (!branchNames.has(branch.name)) {
                            allBranches.push(branch);
                            branchNames.add(branch.name);
                        }
                    }
                    responseText_2 = "Branches in ".concat(repo.name, ":\n\n");
                    if (allBranches.length === 0) {
                        responseText_2 = "No branches found in ".concat(repo.name, ".");
                    }
                    else {
                        currentBranch = allBranches.find(function (branch) { return branch.isCurrent; });
                        otherBranches = allBranches.filter(function (branch) { return !branch.isCurrent; });
                        // Show current branch first
                        if (currentBranch) {
                            responseText_2 += "Current branch: ".concat(currentBranch.name, " ").concat(currentBranch.isLocal ? "(local)" : "(remote)", "\n\n");
                        }
                        // Show other branches
                        responseText_2 += "All branches:\n";
                        otherBranches.forEach(function (branch, index) {
                            var branchType = [];
                            if (branch.isLocal)
                                branchType.push("local");
                            if (branch.isRemote)
                                branchType.push("remote");
                            responseText_2 += "".concat(index + 1, ". ").concat(branch.name, " (").concat(branchType.join(", "), ")\n");
                        });
                    }
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: responseText_2,
                                },
                            ],
                            success: true,
                            branches: allBranches,
                        }];
                }
                catch (error) {
                    errorMessage = error.message || String(error);
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error listing branches: ".concat(errorMessage),
                                },
                            ],
                            success: false,
                            error: errorMessage,
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                error_7 = _d.sent();
                errorMessage = error_7.message || String(error_7);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error listing branches: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_create_branch", "Create a new branch in a GitHub repository.", {
    repository_id: zod_1.z.string(),
    branch_name: zod_1.z.string(),
    base_branch: zod_1.z.string().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_7, execSync_6, response, errorText, repo, branchesOutput, branches, pushOutput, errorMessage, error_8, errorMessage;
    var repository_id = _b.repository_id, branch_name = _b.branch_name, base_branch = _b.base_branch;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_7 = (_c.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_6 = (_c.sent()).execSync;
                return [4 /*yield*/, fetch_7("http://localhost:3000/api/github/".concat(repository_id))];
            case 3:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                repo = _c.sent();
                if (!repo.path) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path not found for ID: ".concat(repository_id),
                                },
                            ],
                            success: false,
                            error: "Repository path not found",
                        }];
                }
                try {
                    branchesOutput = execSync_6("git branch", {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    branches = branchesOutput
                        .split("\n")
                        .map(function (branch) { return branch.trim().replace(/^\* /, ""); })
                        .filter(function (branch) { return branch; });
                    if (branches.includes(branch_name)) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: "text",
                                        text: "Branch '".concat(branch_name, "' already exists in ").concat(repo.name),
                                    },
                                ],
                                success: false,
                                error: "Branch already exists",
                            }];
                    }
                    // If base branch is specified, checkout that branch first
                    if (base_branch) {
                        execSync_6("git checkout ".concat(base_branch), {
                            cwd: repo.path,
                            encoding: "utf8",
                            stdio: "pipe",
                        });
                    }
                    // Create new branch
                    execSync_6("git checkout -b ".concat(branch_name), {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    pushOutput = execSync_6("git push -u origin ".concat(branch_name), {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Successfully created branch '".concat(branch_name, "' in ").concat(repo.name, " and pushed to remote:\n\n").concat(pushOutput),
                                },
                            ],
                            success: true,
                            branchName: branch_name,
                            pushOutput: pushOutput,
                        }];
                }
                catch (error) {
                    errorMessage = error.message || String(error);
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error creating branch: ".concat(errorMessage),
                                },
                            ],
                            success: false,
                            error: errorMessage,
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                error_8 = _c.sent();
                errorMessage = error_8.message || String(error_8);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error creating branch: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_switch_branch", "Switch to a different branch in a GitHub repository.", {
    repository_id: zod_1.z.string(),
    branch_name: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_8, execSync_7, response, errorText, repo, statusOutput, hasUncommittedChanges, branchesOutput, localBranches, checkoutCommand, remoteBranchesOutput, remoteBranches, output, errorMessage, error_9, errorMessage;
    var repository_id = _b.repository_id, branch_name = _b.branch_name;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_8 = (_c.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_7 = (_c.sent()).execSync;
                return [4 /*yield*/, fetch_8("http://localhost:3000/api/github/".concat(repository_id))];
            case 3:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                repo = _c.sent();
                if (!repo.path) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path not found for ID: ".concat(repository_id),
                                },
                            ],
                            success: false,
                            error: "Repository path not found",
                        }];
                }
                try {
                    statusOutput = execSync_7("git status --porcelain", {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    hasUncommittedChanges = statusOutput.trim() !== "";
                    if (hasUncommittedChanges) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: "text",
                                        text: "Cannot switch branches: You have uncommitted changes in ".concat(repo.name, ". Please commit or stash your changes first."),
                                    },
                                ],
                                success: false,
                                error: "Uncommitted changes",
                                hasUncommittedChanges: hasUncommittedChanges,
                            }];
                    }
                    branchesOutput = execSync_7("git branch", {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    localBranches = branchesOutput
                        .split("\n")
                        .map(function (branch) { return branch.trim().replace(/^\* /, ""); })
                        .filter(function (branch) { return branch; });
                    checkoutCommand = void 0;
                    if (localBranches.includes(branch_name)) {
                        // Branch exists locally, just checkout
                        checkoutCommand = "git checkout ".concat(branch_name);
                    }
                    else {
                        remoteBranchesOutput = execSync_7("git branch -r", {
                            cwd: repo.path,
                            encoding: "utf8",
                            stdio: "pipe",
                        });
                        remoteBranches = remoteBranchesOutput
                            .split("\n")
                            .map(function (branch) { return branch.trim(); })
                            .filter(function (branch) { return branch; })
                            .map(function (branch) {
                            return branch.startsWith("origin/") ? branch.substring(7) : branch;
                        });
                        if (remoteBranches.includes(branch_name)) {
                            // Branch exists remotely, checkout and track
                            checkoutCommand = "git checkout -b ".concat(branch_name, " origin/").concat(branch_name);
                        }
                        else {
                            return [2 /*return*/, {
                                    content: [
                                        {
                                            type: "text",
                                            text: "Branch '".concat(branch_name, "' does not exist locally or remotely in ").concat(repo.name),
                                        },
                                    ],
                                    success: false,
                                    error: "Branch not found",
                                }];
                        }
                    }
                    output = execSync_7(checkoutCommand, {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Successfully switched to branch '".concat(branch_name, "' in ").concat(repo.name, ":\n\n").concat(output),
                                },
                            ],
                            success: true,
                            branchName: branch_name,
                            output: output,
                        }];
                }
                catch (error) {
                    errorMessage = error.message || String(error);
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error switching branch: ".concat(errorMessage),
                                },
                            ],
                            success: false,
                            error: errorMessage,
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                error_9 = _c.sent();
                errorMessage = error_9.message || String(error_9);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error switching branch: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_search_code", "Search for code in GitHub repositories.", {
    query: zod_1.z.string(),
    repository_id: zod_1.z.string().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_9, url, response, errorText, results, responseText_3, error_10, errorMessage;
    var query = _b.query, repository_id = _b.repository_id;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 6, , 7]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_9 = (_c.sent()).default;
                url = new URL("http://localhost:3000/api/github/search");
                url.searchParams.append("q", query);
                if (repository_id) {
                    url.searchParams.append("repositoryId", repository_id);
                }
                return [4 /*yield*/, fetch_9(url.toString(), {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })];
            case 2:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, response.text()];
            case 3:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [
                            { type: "text", text: "Failed to search code: ".concat(errorText) },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 4: return [4 /*yield*/, response.json()];
            case 5:
                results = _c.sent();
                responseText_3 = "Found ".concat(results.length, " results for \"").concat(query, "\":\n\n");
                if (results.length === 0) {
                    responseText_3 = "No results found for \"".concat(query, "\".");
                }
                else {
                    results.forEach(function (result, index) {
                        responseText_3 += "".concat(index + 1, ". ").concat(result.repositoryName, "/").concat(result.filePath, "\n");
                        // Add a snippet of the content if available
                        if (result.content) {
                            // Extract a snippet around the match
                            var lines = result.content.split("\n");
                            var matchIndex = lines.findIndex(function (line) {
                                return line.toLowerCase().includes(query.toLowerCase());
                            });
                            if (matchIndex !== -1) {
                                var startLine = Math.max(0, matchIndex - 2);
                                var endLine = Math.min(lines.length - 1, matchIndex + 2);
                                responseText_3 += "```\n";
                                for (var i = startLine; i <= endLine; i++) {
                                    var linePrefix = i === matchIndex ? "> " : "  ";
                                    responseText_3 += "".concat(linePrefix).concat(lines[i], "\n");
                                }
                                responseText_3 += "```\n";
                            }
                        }
                        responseText_3 += "\n";
                    });
                }
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: responseText_3,
                            },
                        ],
                        success: true,
                        results: results,
                    }];
            case 6:
                error_10 = _c.sent();
                errorMessage = error_10.message || String(error_10);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error searching GitHub code: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 7: return [2 /*return*/];
        }
    });
}); });
server.tool("github_commit_history", "Get commit history for a GitHub repository.", {
    repository_id: zod_1.z.string(),
    branch: zod_1.z.string().optional(),
    limit: zod_1.z.number().optional(),
    path: zod_1.z.string().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_10, execSync_8, response, errorText, repo, command, output, commits, responseText_4, errorMessage, error_11, errorMessage;
    var repository_id = _b.repository_id, branch = _b.branch, _c = _b.limit, limit = _c === void 0 ? 10 : _c, path = _b.path;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_10 = (_d.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_8 = (_d.sent()).execSync;
                return [4 /*yield*/, fetch_10("http://localhost:3000/api/github/".concat(repository_id))];
            case 3:
                response = _d.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                repo = _d.sent();
                if (!repo.path) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path not found for ID: ".concat(repository_id),
                                },
                            ],
                            success: false,
                            error: "Repository path not found",
                        }];
                }
                try {
                    command = "git log --pretty=format:\"%h|%an|%ad|%s\" --date=relative";
                    // Add branch if specified
                    if (branch) {
                        command += " ".concat(branch);
                    }
                    // Add path if specified
                    if (path) {
                        command += " -- ".concat(path);
                    }
                    // Add limit
                    command += " -".concat(limit);
                    output = execSync_8(command, {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    commits = output
                        .split("\n")
                        .filter(function (line) { return line.trim(); })
                        .map(function (line) {
                        var _a = line.split("|"), hash = _a[0], author = _a[1], date = _a[2], messageParts = _a.slice(3);
                        var message = messageParts.join("|"); // In case commit message contains '|'
                        return { hash: hash, author: author, date: date, message: message };
                    });
                    responseText_4 = "Commit history for ".concat(repo.name);
                    if (branch)
                        responseText_4 += " (".concat(branch, ")");
                    if (path)
                        responseText_4 += " - ".concat(path);
                    responseText_4 += ":\n\n";
                    if (commits.length === 0) {
                        responseText_4 = "No commits found for ".concat(repo.name);
                        if (branch)
                            responseText_4 += " (".concat(branch, ")");
                        if (path)
                            responseText_4 += " - ".concat(path);
                        responseText_4 += ".";
                    }
                    else {
                        commits.forEach(function (commit, index) {
                            responseText_4 += "".concat(index + 1, ". ").concat(commit.hash, " - ").concat(commit.message, "\n");
                            responseText_4 += "   Author: ".concat(commit.author, ", ").concat(commit.date, "\n\n");
                        });
                    }
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: responseText_4,
                                },
                            ],
                            success: true,
                            commits: commits,
                        }];
                }
                catch (error) {
                    errorMessage = error.message || String(error);
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error getting commit history: ".concat(errorMessage),
                                },
                            ],
                            success: false,
                            error: errorMessage,
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                error_11 = _d.sent();
                errorMessage = error_11.message || String(error_11);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error getting commit history: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_view_commit", "View details of a specific commit in a GitHub repository.", {
    repository_id: zod_1.z.string(),
    commit_hash: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_11, execSync_9, response, errorText, repo, commitDetails, firstLine, _c, hash, author, email, date, messageParts, message, diff, responseText, errorMessage, error_12, errorMessage;
    var repository_id = _b.repository_id, commit_hash = _b.commit_hash;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_11 = (_d.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("child_process"); })];
            case 2:
                execSync_9 = (_d.sent()).execSync;
                return [4 /*yield*/, fetch_11("http://localhost:3000/api/github/".concat(repository_id))];
            case 3:
                response = _d.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                repo = _d.sent();
                if (!repo.path) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Repository path not found for ID: ".concat(repository_id),
                                },
                            ],
                            success: false,
                            error: "Repository path not found",
                        }];
                }
                try {
                    commitDetails = execSync_9("git show --pretty=format:\"%h|%an|%ae|%ad|%s\" --date=iso ".concat(commit_hash), {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    firstLine = commitDetails.split("\n")[0];
                    _c = firstLine.split("|"), hash = _c[0], author = _c[1], email = _c[2], date = _c[3], messageParts = _c.slice(4);
                    message = messageParts.join("|");
                    diff = execSync_9("git show --stat --patch ".concat(commit_hash), {
                        cwd: repo.path,
                        encoding: "utf8",
                        stdio: "pipe",
                    });
                    responseText = "Commit ".concat(hash, " in ").concat(repo.name, ":\n\n") +
                        "Author: ".concat(author, " <").concat(email, ">\n") +
                        "Date: ".concat(date, "\n") +
                        "Message: ".concat(message, "\n\n") +
                        "Changes:\n\n" +
                        "```diff\n".concat(diff, "\n```");
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: responseText,
                                },
                            ],
                            success: true,
                            commit: {
                                hash: hash,
                                author: author,
                                email: email,
                                date: date,
                                message: message,
                                diff: diff,
                            },
                        }];
                }
                catch (error) {
                    errorMessage = error.message || String(error);
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Error viewing commit: ".concat(errorMessage),
                                },
                            ],
                            success: false,
                            error: errorMessage,
                        }];
                }
                return [3 /*break*/, 8];
            case 7:
                error_12 = _d.sent();
                errorMessage = error_12.message || String(error_12);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error viewing commit: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_get_file", "Get the content of a file from a GitHub repository.", {
    repository_id: zod_1.z.string(),
    file_path: zod_1.z.string(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_12, path_1, url, response, errorText, result, extension, language, languageMap, responseText, error_13, errorMessage;
    var repository_id = _b.repository_id, file_path = _b.file_path;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_12 = (_c.sent()).default;
                return [4 /*yield*/, Promise.resolve().then(function () { return require("path"); })];
            case 2:
                path_1 = _c.sent();
                url = new URL("http://localhost:3000/api/github/".concat(repository_id, "/file"));
                url.searchParams.append("path", file_path);
                return [4 /*yield*/, fetch_12(url.toString(), {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })];
            case 3:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 5];
                return [4 /*yield*/, response.text()];
            case 4:
                errorText = _c.sent();
                return [2 /*return*/, {
                        content: [{ type: "text", text: "Failed to get file: ".concat(errorText) }],
                        success: false,
                        error: errorText,
                    }];
            case 5: return [4 /*yield*/, response.json()];
            case 6:
                result = _c.sent();
                extension = path_1.extname(file_path).toLowerCase().substring(1);
                language = "";
                languageMap = {
                    js: "javascript",
                    jsx: "javascript",
                    ts: "typescript",
                    tsx: "typescript",
                    py: "python",
                    rb: "ruby",
                    java: "java",
                    c: "c",
                    cpp: "cpp",
                    cs: "csharp",
                    go: "go",
                    rs: "rust",
                    php: "php",
                    html: "html",
                    css: "css",
                    json: "json",
                    md: "markdown",
                    sql: "sql",
                    sh: "bash",
                    bat: "batch",
                    ps1: "powershell",
                    yml: "yaml",
                    yaml: "yaml",
                    xml: "xml",
                    swift: "swift",
                    kt: "kotlin",
                    dart: "dart",
                };
                language = languageMap[extension] || "";
                responseText = "File: ".concat(file_path, "\n\n```").concat(language, "\n").concat(result.content, "\n```\n");
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: responseText,
                            },
                        ],
                        success: true,
                        file: {
                            path: file_path,
                            content: result.content,
                            language: result.language || language,
                        },
                    }];
            case 7:
                error_13 = _c.sent();
                errorMessage = error_13.message || String(error_13);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error retrieving file: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); });
server.tool("github_list_pull_requests", "List pull requests for a GitHub repository.", {
    repository_id: zod_1.z.string(),
    state: zod_1.z.enum(["open", "closed", "all"]).optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_13, repoResponse, errorText, repo, accountResponse, account, owner, repoName, match, prResponse, errorText, pullRequests, responseText_5, error_14, errorMessage;
    var _c;
    var repository_id = _b.repository_id, _d = _b.state, state = _d === void 0 ? "open" : _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 12, , 13]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_13 = (_e.sent()).default;
                return [4 /*yield*/, fetch_13("http://localhost:3000/api/github/".concat(repository_id))];
            case 2:
                repoResponse = _e.sent();
                if (!!repoResponse.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, repoResponse.text()];
            case 3:
                errorText = _e.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 4: return [4 /*yield*/, repoResponse.json()];
            case 5:
                repo = _e.sent();
                return [4 /*yield*/, fetch_13("http://localhost:3000/api/github/account")];
            case 6:
                accountResponse = _e.sent();
                if (!accountResponse.ok) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to get GitHub account. Please connect your GitHub account first.",
                                },
                            ],
                            success: false,
                            error: "GitHub account not connected",
                        }];
                }
                return [4 /*yield*/, accountResponse.json()];
            case 7:
                account = _e.sent();
                if (!account.accessToken) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "GitHub account is connected but no access token is available.",
                                },
                            ],
                            success: false,
                            error: "No GitHub access token",
                        }];
                }
                owner = void 0, repoName = void 0;
                if (repo.url) {
                    match = repo.url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
                    if (match) {
                        owner = match[1];
                        repoName = match[2];
                        if (repoName.endsWith(".git")) {
                            repoName = repoName.slice(0, -4);
                        }
                    }
                }
                if (!owner || !repoName) {
                    // Try to extract from name
                    if (repo.name && repo.name.includes("/")) {
                        _c = repo.name.split("/"), owner = _c[0], repoName = _c[1];
                    }
                    else {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: "text",
                                        text: "Could not determine GitHub repository owner and name from repository information.",
                                    },
                                ],
                                success: false,
                                error: "Could not determine repository owner and name",
                            }];
                    }
                }
                return [4 /*yield*/, fetch_13("https://api.github.com/repos/".concat(owner, "/").concat(repoName, "/pulls?state=").concat(state), {
                        headers: {
                            Authorization: "token ".concat(account.accessToken),
                            Accept: "application/vnd.github.v3+json",
                        },
                    })];
            case 8:
                prResponse = _e.sent();
                if (!!prResponse.ok) return [3 /*break*/, 10];
                return [4 /*yield*/, prResponse.text()];
            case 9:
                errorText = _e.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to fetch pull requests: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 10: return [4 /*yield*/, prResponse.json()];
            case 11:
                pullRequests = _e.sent();
                responseText_5 = "".concat(pullRequests.length, " ").concat(state, " pull requests for ").concat(owner, "/").concat(repoName, ":\n\n");
                if (pullRequests.length === 0) {
                    responseText_5 = "No ".concat(state, " pull requests found for ").concat(owner, "/").concat(repoName, ".");
                }
                else {
                    pullRequests.forEach(function (pr, index) {
                        responseText_5 += "".concat(index + 1, ". #").concat(pr.number, ": ").concat(pr.title, "\n");
                        responseText_5 += "   Created by ".concat(pr.user.login, " on ").concat(new Date(pr.created_at).toLocaleDateString(), "\n");
                        responseText_5 += "   ".concat(pr.html_url, "\n\n");
                    });
                }
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: responseText_5,
                            },
                        ],
                        success: true,
                        pullRequests: pullRequests,
                    }];
            case 12:
                error_14 = _e.sent();
                errorMessage = error_14.message || String(error_14);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error listing pull requests: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 13: return [2 /*return*/];
        }
    });
}); });
server.tool("github_create_pull_request", "Create a new pull request in a GitHub repository.", {
    repository_id: zod_1.z.string(),
    title: zod_1.z.string(),
    head: zod_1.z.string(),
    base: zod_1.z.string(),
    body: zod_1.z.string().optional(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_14, repoResponse, errorText, repo, accountResponse, account, owner, repoName, match, prResponse, errorData, pullRequest, error_15, errorMessage;
    var _c;
    var repository_id = _b.repository_id, title = _b.title, head = _b.head, base = _b.base, _d = _b.body, body = _d === void 0 ? "" : _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 12, , 13]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_14 = (_e.sent()).default;
                return [4 /*yield*/, fetch_14("http://localhost:3000/api/github/".concat(repository_id))];
            case 2:
                repoResponse = _e.sent();
                if (!!repoResponse.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, repoResponse.text()];
            case 3:
                errorText = _e.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 4: return [4 /*yield*/, repoResponse.json()];
            case 5:
                repo = _e.sent();
                return [4 /*yield*/, fetch_14("http://localhost:3000/api/github/account")];
            case 6:
                accountResponse = _e.sent();
                if (!accountResponse.ok) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to get GitHub account. Please connect your GitHub account first.",
                                },
                            ],
                            success: false,
                            error: "GitHub account not connected",
                        }];
                }
                return [4 /*yield*/, accountResponse.json()];
            case 7:
                account = _e.sent();
                if (!account.accessToken) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "GitHub account is connected but no access token is available.",
                                },
                            ],
                            success: false,
                            error: "No GitHub access token",
                        }];
                }
                owner = void 0, repoName = void 0;
                if (repo.url) {
                    match = repo.url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
                    if (match) {
                        owner = match[1];
                        repoName = match[2];
                        if (repoName.endsWith(".git")) {
                            repoName = repoName.slice(0, -4);
                        }
                    }
                }
                if (!owner || !repoName) {
                    // Try to extract from name
                    if (repo.name && repo.name.includes("/")) {
                        _c = repo.name.split("/"), owner = _c[0], repoName = _c[1];
                    }
                    else {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: "text",
                                        text: "Could not determine GitHub repository owner and name from repository information.",
                                    },
                                ],
                                success: false,
                                error: "Could not determine repository owner and name",
                            }];
                    }
                }
                return [4 /*yield*/, fetch_14("https://api.github.com/repos/".concat(owner, "/").concat(repoName, "/pulls"), {
                        method: "POST",
                        headers: {
                            Authorization: "token ".concat(account.accessToken),
                            Accept: "application/vnd.github.v3+json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            title: title,
                            head: head,
                            base: base,
                            body: body,
                        }),
                    })];
            case 8:
                prResponse = _e.sent();
                if (!!prResponse.ok) return [3 /*break*/, 10];
                return [4 /*yield*/, prResponse.json()];
            case 9:
                errorData = _e.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to create pull request: ".concat(errorData.message || prResponse.statusText),
                            },
                        ],
                        success: false,
                        error: errorData.message || prResponse.statusText,
                    }];
            case 10: return [4 /*yield*/, prResponse.json()];
            case 11:
                pullRequest = _e.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Successfully created pull request #".concat(pullRequest.number, ": ").concat(pullRequest.title, "\n\nURL: ").concat(pullRequest.html_url),
                            },
                        ],
                        success: true,
                        pullRequest: pullRequest,
                    }];
            case 12:
                error_15 = _e.sent();
                errorMessage = error_15.message || String(error_15);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error creating pull request: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 13: return [2 /*return*/];
        }
    });
}); });
server.tool("github_view_pull_request", "View details of a specific pull request in a GitHub repository.", {
    repository_id: zod_1.z.string(),
    pull_number: zod_1.z.number(),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var fetch_15, repoResponse, errorText, repo, accountResponse, account, owner, repoName, match, prResponse, errorText, pr, createdDate, updatedDate, responseText_6, commentsResponse, comments, error_16, errorMessage;
    var _c;
    var repository_id = _b.repository_id, pull_number = _b.pull_number;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 15, , 16]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require("node-fetch"); })];
            case 1:
                fetch_15 = (_d.sent()).default;
                return [4 /*yield*/, fetch_15("http://localhost:3000/api/github/".concat(repository_id))];
            case 2:
                repoResponse = _d.sent();
                if (!!repoResponse.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, repoResponse.text()];
            case 3:
                errorText = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to get repository details: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 4: return [4 /*yield*/, repoResponse.json()];
            case 5:
                repo = _d.sent();
                return [4 /*yield*/, fetch_15("http://localhost:3000/api/github/account")];
            case 6:
                accountResponse = _d.sent();
                if (!accountResponse.ok) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to get GitHub account. Please connect your GitHub account first.",
                                },
                            ],
                            success: false,
                            error: "GitHub account not connected",
                        }];
                }
                return [4 /*yield*/, accountResponse.json()];
            case 7:
                account = _d.sent();
                if (!account.accessToken) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "GitHub account is connected but no access token is available.",
                                },
                            ],
                            success: false,
                            error: "No GitHub access token",
                        }];
                }
                owner = void 0, repoName = void 0;
                if (repo.url) {
                    match = repo.url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
                    if (match) {
                        owner = match[1];
                        repoName = match[2];
                        if (repoName.endsWith(".git")) {
                            repoName = repoName.slice(0, -4);
                        }
                    }
                }
                if (!owner || !repoName) {
                    // Try to extract from name
                    if (repo.name && repo.name.includes("/")) {
                        _c = repo.name.split("/"), owner = _c[0], repoName = _c[1];
                    }
                    else {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: "text",
                                        text: "Could not determine GitHub repository owner and name from repository information.",
                                    },
                                ],
                                success: false,
                                error: "Could not determine repository owner and name",
                            }];
                    }
                }
                return [4 /*yield*/, fetch_15("https://api.github.com/repos/".concat(owner, "/").concat(repoName, "/pulls/").concat(pull_number), {
                        headers: {
                            Authorization: "token ".concat(account.accessToken),
                            Accept: "application/vnd.github.v3+json",
                        },
                    })];
            case 8:
                prResponse = _d.sent();
                if (!!prResponse.ok) return [3 /*break*/, 10];
                return [4 /*yield*/, prResponse.text()];
            case 9:
                errorText = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Failed to fetch pull request: ".concat(errorText),
                            },
                        ],
                        success: false,
                        error: errorText,
                    }];
            case 10: return [4 /*yield*/, prResponse.json()];
            case 11:
                pr = _d.sent();
                createdDate = new Date(pr.created_at).toLocaleString();
                updatedDate = new Date(pr.updated_at).toLocaleString();
                responseText_6 = "Pull Request #".concat(pr.number, ": ").concat(pr.title, "\n\n");
                responseText_6 += "Status: ".concat(pr.state, " ").concat(pr.merged ? "(merged)" : "", "\n");
                responseText_6 += "Author: ".concat(pr.user.login, "\n");
                responseText_6 += "Created: ".concat(createdDate, "\n");
                responseText_6 += "Updated: ".concat(updatedDate, "\n");
                responseText_6 += "URL: ".concat(pr.html_url, "\n\n");
                responseText_6 += "Branches: ".concat(pr.head.label, " \u2192 ").concat(pr.base.label, "\n\n");
                if (pr.body) {
                    responseText_6 += "Description:\n".concat(pr.body, "\n\n");
                }
                return [4 /*yield*/, fetch_15("https://api.github.com/repos/".concat(owner, "/").concat(repoName, "/issues/").concat(pull_number, "/comments"), {
                        headers: {
                            Authorization: "token ".concat(account.accessToken),
                            Accept: "application/vnd.github.v3+json",
                        },
                    })];
            case 12:
                commentsResponse = _d.sent();
                if (!commentsResponse.ok) return [3 /*break*/, 14];
                return [4 /*yield*/, commentsResponse.json()];
            case 13:
                comments = _d.sent();
                if (comments.length > 0) {
                    responseText_6 += "Comments (".concat(comments.length, "):\n\n");
                    comments.forEach(function (comment, index) {
                        responseText_6 += "".concat(comment.user.login, " (").concat(new Date(comment.created_at).toLocaleString(), "):\n").concat(comment.body, "\n\n");
                    });
                }
                _d.label = 14;
            case 14: return [2 /*return*/, {
                    content: [
                        {
                            type: "text",
                            text: responseText_6,
                        },
                    ],
                    success: true,
                    pullRequest: pr,
                }];
            case 15:
                error_16 = _d.sent();
                errorMessage = error_16.message || String(error_16);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error viewing pull request: ".concat(errorMessage),
                            },
                        ],
                        success: false,
                        error: errorMessage,
                    }];
            case 16: return [2 /*return*/];
        }
    });
}); });
server.tool("idle", "A special tool to indicate completion of all tasks.", {}, function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, { content: [{ type: "text", text: "Entering idle state" }] }];
    });
}); });
// Connect the server to the transport
await server.connect(transport);
