import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { executeCode } from "./code-execution.js";

// Create the server
const server = new McpServer({
  name: "custom-mcp-server",
  version: "0.0.1",
});

// Create the transport
const transport = new StdioServerTransport();

server.tool(
  "get_weather",
  "Get the current weather at a location.",
  {
    latitude: z.number(),
    longitude: z.number(),
  },
  async ({ latitude, longitude }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
    );
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `The current temperature in ${latitude}, ${longitude} is ${data.current.temperature_2m}°C.`,
        },
        {
          type: "text",
          text: `The sunrise in ${latitude}, ${longitude} is ${data.daily.sunrise[0]} and the sunset is ${data.daily.sunset[0]}.`,
        },
      ],
    };
  },
);

server.tool(
  "message_notify_user",
  "Send a message to user without requiring a response.",
  {
    text: z.string(),
    attachments: z.union([z.string(), z.array(z.string())]).optional(),
  },
  async ({ text, attachments }) => {
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "message_ask_user",
  "Ask user a question and wait for response.",
  {
    text: z.string(),
    attachments: z.union([z.string(), z.array(z.string())]).optional(),
    suggest_user_takeover: z.enum(["none", "browser"]).optional(),
  },
  async ({ text, attachments, suggest_user_takeover }) => {
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "file_read",
  "Read file content.",
  {
    file: z.string(),
    start_line: z.number().optional(),
    end_line: z.number().optional(),
    sudo: z.boolean().optional(),
  },
  async ({ file, start_line, end_line, sudo }) => {
    return { content: [{ type: "text", text: "File read" }] };
  },
);

server.tool(
  "file_write",
  "Overwrite or append content to a file.",
  {
    file: z.string(),
    content: z.string(),
    append: z.boolean().optional(),
    leading_newline: z.boolean().optional(),
    trailing_newline: z.boolean().optional(),
    sudo: z.boolean().optional(),
  },
  async ({
    file,
    content,
    append,
    leading_newline,
    trailing_newline,
    sudo,
  }) => {
    return { content: [{ type: "text", text: "File written" }] };
  },
);

server.tool(
  "file_str_replace",
  "Replace specified string in a file.",
  {
    file: z.string(),
    old_str: z.string(),
    new_str: z.string(),
    sudo: z.boolean().optional(),
  },
  async ({ file, old_str, new_str, sudo }) => {
    return { content: [{ type: "text", text: "String replaced" }] };
  },
);

server.tool(
  "file_find_in_content",
  "Search for matching text within file content.",
  {
    file: z.string(),
    regex: z.string(),
    sudo: z.boolean().optional(),
  },
  async ({ file, regex, sudo }) => {
    return { content: [{ type: "text", text: "Content found" }] };
  },
);

server.tool(
  "file_find_by_name",
  "Find files by name pattern in specified directory.",
  {
    path: z.string(),
    glob: z.string(),
  },
  async ({ path, glob }) => {
    return { content: [{ type: "text", text: "Files found" }] };
  },
);

server.tool(
  "shell_exec",
  "Execute commands in a specified shell session.",
  {
    id: z.string(),
    exec_dir: z.string(),
    command: z.string(),
  },
  async ({ id, exec_dir, command }) => {
    return { content: [{ type: "text", text: "Command executed" }] };
  },
);

server.tool(
  "shell_view",
  "View the content of a specified shell session.",
  {
    id: z.string(),
  },
  async ({ id }) => {
    return { content: [{ type: "text", text: "Shell content viewed" }] };
  },
);

server.tool(
  "shell_wait",
  "Wait for the running process in a specified shell session to return.",
  {
    id: z.string(),
    seconds: z.number().optional(),
  },
  async ({ id, seconds }) => {
    return { content: [{ type: "text", text: "Process completed" }] };
  },
);

server.tool(
  "shell_write_to_process",
  "Write input to a running process in a specified shell session.",
  {
    id: z.string(),
    input: z.string(),
    press_enter: z.boolean(),
  },
  async ({ id, input, press_enter }) => {
    return { content: [{ type: "text", text: "Input written" }] };
  },
);

server.tool(
  "shell_kill_process",
  "Terminate a running process in a specified shell session.",
  {
    id: z.string(),
  },
  async ({ id }) => {
    return { content: [{ type: "text", text: "Process killed" }] };
  },
);

server.tool(
  "browser_view",
  "View content of the current browser page.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Browser content viewed" }] };
  },
);

server.tool(
  "browser_navigate",
  "Navigate browser to specified URL.",
  {
    url: z.string(),
  },
  async ({ url }) => {
    return { content: [{ type: "text", text: "Navigated to URL" }] };
  },
);

server.tool(
  "browser_restart",
  "Restart browser and navigate to specified URL.",
  {
    url: z.string(),
  },
  async ({ url }) => {
    return { content: [{ type: "text", text: "Browser restarted" }] };
  },
);

server.tool(
  "browser_click",
  "Click on elements in the current browser page.",
  {
    index: z.number().optional(),
    coordinate_x: z.number().optional(),
    coordinate_y: z.number().optional(),
  },
  async ({ index, coordinate_x, coordinate_y }) => {
    return { content: [{ type: "text", text: "Element clicked" }] };
  },
);

server.tool(
  "browser_input",
  "Overwrite text in editable elements on the current browser page.",
  {
    index: z.number().optional(),
    coordinate_x: z.number().optional(),
    coordinate_y: z.number().optional(),
    text: z.string(),
    press_enter: z.boolean(),
  },
  async ({ index, coordinate_x, coordinate_y, text, press_enter }) => {
    return { content: [{ type: "text", text: "Text input complete" }] };
  },
);

server.tool(
  "browser_move_mouse",
  "Move cursor to specified position on the current browser page.",
  {
    coordinate_x: z.number(),
    coordinate_y: z.number(),
  },
  async ({ coordinate_x, coordinate_y }) => {
    return { content: [{ type: "text", text: "Mouse moved" }] };
  },
);

server.tool(
  "browser_press_key",
  "Simulate key press in the current browser page.",
  {
    key: z.string(),
  },
  async ({ key }) => {
    return { content: [{ type: "text", text: "Key pressed" }] };
  },
);

server.tool(
  "browser_select_option",
  "Select specified option from dropdown list element in the current browser page.",
  {
    index: z.number(),
    option: z.number(),
  },
  async ({ index, option }) => {
    return { content: [{ type: "text", text: "Option selected" }] };
  },
);

server.tool(
  "browser_scroll_up",
  "Scroll up the current browser page.",
  {
    to_top: z.boolean().optional(),
  },
  async ({ to_top }) => {
    return { content: [{ type: "text", text: "Scrolled up" }] };
  },
);

server.tool(
  "browser_scroll_down",
  "Scroll down the current browser page.",
  {
    to_bottom: z.boolean().optional(),
  },
  async ({ to_bottom }) => {
    return { content: [{ type: "text", text: "Scrolled down" }] };
  },
);

server.tool(
  "browser_console_exec",
  "Execute JavaScript code in browser console.",
  {
    javascript: z.string(),
  },
  async ({ javascript }) => {
    return { content: [{ type: "text", text: "JavaScript executed" }] };
  },
);

server.tool(
  "browser_console_view",
  "View browser console output.",
  {
    max_lines: z.number().optional(),
  },
  async ({ max_lines }) => {
    return { content: [{ type: "text", text: "Console output viewed" }] };
  },
);

server.tool(
  "info_search_web",
  "Search web pages using search engine.",
  {
    query: z.string(),
    date_range: z
      .enum([
        "all",
        "past_hour",
        "past_day",
        "past_week",
        "past_month",
        "past_year",
      ])
      .optional(),
  },
  async ({ query, date_range }) => {
    return { content: [{ type: "text", text: "Web search completed" }] };
  },
);

server.tool(
  "deploy_expose_port",
  "Expose specified local port for temporary public access.",
  {
    port: z.number(),
  },
  async ({ port }) => {
    return { content: [{ type: "text", text: "Port exposed" }] };
  },
);

server.tool(
  "deploy_apply_deployment",
  "Deploy website or application to public production environment.",
  {
    type: z.enum(["static", "nextjs"]),
    local_dir: z.string(),
  },
  async ({ type, local_dir }) => {
    return { content: [{ type: "text", text: "Deployment applied" }] };
  },
);

server.tool(
  "make_manus_page",
  "Make a Manus Page from a local MDX file.",
  {
    mdx_file_path: z.string(),
  },
  async ({ mdx_file_path }) => {
    return { content: [{ type: "text", text: "Manus page created" }] };
  },
);

// RAG Tools
server.tool(
  "rag_ingest_document",
  "Ingest a document into the RAG system.",
  {
    libraryId: z.string(),
    title: z.string(),
    filePath: z.string(),
    mimeType: z.string(),
    description: z.string().optional(),
  },
  async ({ libraryId, title, filePath, mimeType, description }) => {
    try {
      // Make an API call to ingest the document
      const fetch = (await import("node-fetch")).default;
      const formData = new FormData();
      formData.append("libraryId", libraryId);
      formData.append("title", title);
      if (description) formData.append("description", description);

      // Read the file and append it to the form data
      const fs = await import("fs");
      const buffer = fs.readFileSync(filePath);
      const fileName = filePath.split(/[\\/]/).pop();
      const file = new Blob([buffer], { type: mimeType });
      formData.append("file", file, fileName);

      const response = await fetch("http://localhost:3000/api/rag/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            { type: "text", text: `Failed to ingest document: ${errorText}` },
          ],
          success: false,
          error: errorText,
        };
      }

      const document = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Document "${document.title}" ingested successfully with ID: ${document.id}`,
          },
        ],
        success: true,
        document,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error ingesting document: ${error.message || String(error)}`,
          },
        ],
        success: false,
        error: error.message || String(error),
      };
    }
  },
);

server.tool(
  "rag_ingest_text",
  "Ingest text content into the RAG system.",
  {
    libraryId: z.string(),
    title: z.string(),
    content: z.string(),
    description: z.string().optional(),
  },
  async ({ libraryId, title, content, description }) => {
    try {
      // Make an API call to ingest the text
      const fetch = (await import("node-fetch")).default;
      const formData = new FormData();
      formData.append("libraryId", libraryId);
      formData.append("title", title);
      formData.append("content", content);
      if (description) formData.append("description", description);

      const response = await fetch("http://localhost:3000/api/rag/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            { type: "text", text: `Failed to ingest text: ${errorText}` },
          ],
          success: false,
          error: errorText,
        };
      }

      const document = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Text "${document.title}" ingested successfully with ID: ${document.id}`,
          },
        ],
        success: true,
        document,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error ingesting text: ${error.message || String(error)}`,
          },
        ],
        success: false,
        error: error.message || String(error),
      };
    }
  },
);

server.tool(
  "rag_query",
  "Query the RAG system for relevant information.",
  {
    query: z.string(),
    libraryIds: z.array(z.string()).optional(),
    maxResults: z.number().optional(),
    similarityThreshold: z.number().optional(),
    filters: z
      .object({
        mimeType: z.union([z.string(), z.array(z.string())]).optional(),
        fileType: z.union([z.string(), z.array(z.string())]).optional(),
        author: z.string().optional(),
        minWordCount: z.number().optional(),
        maxWordCount: z.number().optional(),
      })
      .optional(),
    hybridSearch: z.boolean().optional(),
    keywordWeight: z.number().optional(),
  },
  async ({
    query,
    libraryIds,
    maxResults,
    similarityThreshold,
    filters,
    hybridSearch,
    keywordWeight,
  }) => {
    try {
      // Make an API call to query the RAG system
      const fetch = (await import("node-fetch")).default;
      const url = new URL("http://localhost:3000/api/rag/query");
      url.searchParams.append("q", query);

      if (libraryIds && libraryIds.length > 0) {
        libraryIds.forEach((id) => url.searchParams.append("libraryId", id));
      }

      if (maxResults)
        url.searchParams.append("maxResults", maxResults.toString());
      if (similarityThreshold)
        url.searchParams.append(
          "similarityThreshold",
          similarityThreshold.toString(),
        );

      // Add filters
      if (filters) {
        if (filters.mimeType) {
          if (Array.isArray(filters.mimeType)) {
            filters.mimeType.forEach((type) =>
              url.searchParams.append("mimeType", type),
            );
          } else {
            url.searchParams.append("mimeType", filters.mimeType);
          }
        }

        if (filters.fileType) {
          if (Array.isArray(filters.fileType)) {
            filters.fileType.forEach((type) =>
              url.searchParams.append("fileType", type),
            );
          } else {
            url.searchParams.append("fileType", filters.fileType);
          }
        }

        if (filters.author) url.searchParams.append("author", filters.author);
        if (filters.minWordCount)
          url.searchParams.append(
            "minWordCount",
            filters.minWordCount.toString(),
          );
        if (filters.maxWordCount)
          url.searchParams.append(
            "maxWordCount",
            filters.maxWordCount.toString(),
          );
      }

      // Add hybrid search parameters
      if (hybridSearch) url.searchParams.append("hybridSearch", "true");
      if (keywordWeight)
        url.searchParams.append("keywordWeight", keywordWeight.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            { type: "text", text: `Failed to query RAG system: ${errorText}` },
          ],
          success: false,
          error: errorText,
        };
      }

      const results = await response.json();

      if (results.length === 0) {
        return {
          content: [
            { type: "text", text: `No results found for query: "${query}"` },
          ],
          success: true,
          results: [],
        };
      }

      let responseText = `Found ${results.length} results for query: "${query}"\n\n`;

      results.forEach((result, index) => {
        responseText += `${index + 1}. Document: ${result.documentTitle} (Score: ${result.score.toFixed(2)})\n`;

        // Add metadata if available
        if (result.documentMetadata) {
          const metadata = result.documentMetadata;
          if (metadata.author)
            responseText += `   Author: ${metadata.author}\n`;
          if (metadata.fileType)
            responseText += `   File Type: ${metadata.fileType}\n`;
          if (metadata.wordCount)
            responseText += `   Word Count: ${metadata.wordCount}\n`;
        }

        responseText += `   Content: ${result.content.substring(0, 200)}${result.content.length > 200 ? "..." : ""}\n\n`;
      });

      return {
        content: [{ type: "text", text: responseText }],
        success: true,
        results,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying RAG system: ${error.message || String(error)}`,
          },
        ],
        success: false,
        error: error.message || String(error),
      };
    }
  },
);

server.tool(
  "rag_list_documents",
  "List all documents in a library.",
  {
    libraryId: z.string(),
  },
  async ({ libraryId }) => {
    try {
      // Make an API call to list documents
      const fetch = (await import("node-fetch")).default;
      const url = new URL("http://localhost:3000/api/rag/documents");
      url.searchParams.append("libraryId", libraryId);

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            { type: "text", text: `Failed to list documents: ${errorText}` },
          ],
          success: false,
          error: errorText,
        };
      }

      const documents = await response.json();

      if (documents.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No documents found in library: ${libraryId}`,
            },
          ],
          success: true,
          documents: [],
        };
      }

      let responseText = `Found ${documents.length} documents in library: ${libraryId}\n\n`;

      documents.forEach((doc, index) => {
        responseText += `${index + 1}. ${doc.title}\n`;
        if (doc.description)
          responseText += `   Description: ${doc.description}\n`;
        responseText += `   ID: ${doc.id}\n`;
        responseText += `   Created: ${new Date(doc.createdAt).toLocaleString()}\n\n`;
      });

      return {
        content: [{ type: "text", text: responseText }],
        success: true,
        documents,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing documents: ${error.message || String(error)}`,
          },
        ],
        success: false,
        error: error.message || String(error),
      };
    }
  },
);

server.tool(
  "code_execute",
  "Execute code in a specified programming language.",
  {
    code: z.string(),
    language: z.string(),
  },
  async ({ code, language }) => {
    try {
      const result = await executeCode(code, language);

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: `Code executed successfully in ${result.executionTime}ms:\n\n${result.output || "No output"}`,
            },
          ],
          success: true,
          output: result.output,
          executionTime: result.executionTime,
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Error executing code: ${result.error}\n\n${result.output ? `Output: ${result.output}` : ""}`,
            },
          ],
          success: false,
          error: result.error,
          output: result.output,
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to execute code: ${error.message || String(error)}`,
          },
        ],
        success: false,
        error: error.message || String(error),
      };
    }
  },
);

// Import Node.js modules at the top level
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Define repository interface
interface Repository {
  name: string;
  path: string;
  remote: string;
  branch: string;
  lastCommit: {
    hash?: string;
    message?: string;
    date?: string;
  };
  isGitHubDesktop?: boolean;
}

server.tool(
  "github_list_repositories",
  "List all GitHub repositories mounted in the system.",
  {},
  async () => {
    try {
      // Function to check if a directory is a Git repository
      const isGitRepo = (dirPath: string): boolean => {
        try {
          return fs.existsSync(path.join(dirPath, ".git"));
        } catch (error) {
          return false;
        }
      };

      // Function to check if a Git repository has a GitHub remote
      const hasGitHubRemote = (repoPath: string): boolean => {
        try {
          const remotes = execSync("git remote -v", {
            cwd: repoPath,
            encoding: "utf8",
          });
          return remotes.includes("github.com");
        } catch (error) {
          return false;
        }
      };

      // Function to get repository details
      const getRepoDetails = (repoPath: string): Repository | null => {
        try {
          const name = path.basename(repoPath);

          // Get remote URL
          let remoteUrl = "";
          try {
            remoteUrl = execSync("git config --get remote.origin.url", {
              cwd: repoPath,
              encoding: "utf8",
            }).trim();
          } catch (error) {
            // No remote or not set
          }

          // Get current branch
          let branch = "";
          try {
            branch = execSync("git rev-parse --abbrev-ref HEAD", {
              cwd: repoPath,
              encoding: "utf8",
            }).trim();
          } catch (error) {
            // Not on a branch
          }

          // Get last commit
          let lastCommit: { hash?: string; message?: string; date?: string } =
            {};
          try {
            const commitInfo = execSync(
              'git log -1 --pretty=format:"%h|%s|%cr"',
              { cwd: repoPath, encoding: "utf8" },
            ).trim();
            const [hash, message, date] = commitInfo.split("|");
            lastCommit = { hash, message, date };
          } catch (error) {
            // No commits
          }

          return {
            name,
            path: repoPath,
            remote: remoteUrl,
            branch,
            lastCommit,
          };
        } catch (error) {
          return null;
        }
      };

      // Get common locations where repositories might be stored
      const getCommonRepoLocations = () => {
        const homeDir = os.homedir();

        // Common locations based on operating system
        const locations = [
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
        } else if (process.platform === "darwin") {
          locations.push(path.join(homeDir, "Documents", "GitHub"));
        } else {
          locations.push(path.join(homeDir, "GitHub"));
        }

        return locations.filter((loc) => fs.existsSync(loc));
      };

      // Get GitHub Desktop repository locations
      const getGitHubDesktopLocations = () => {
        try {
          let configPath = "";

          // GitHub Desktop config location based on OS
          if (process.platform === "win32") {
            configPath = path.join(
              os.homedir(),
              "AppData",
              "Roaming",
              "GitHub Desktop",
              "repositories.json",
            );
          } else if (process.platform === "darwin") {
            configPath = path.join(
              os.homedir(),
              "Library",
              "Application Support",
              "GitHub Desktop",
              "repositories.json",
            );
          } else {
            configPath = path.join(
              os.homedir(),
              ".config",
              "GitHub Desktop",
              "repositories.json",
            );
          }

          // Check if config file exists
          if (!fs.existsSync(configPath)) {
            return [];
          }

          // Read and parse config file
          const configData = fs.readFileSync(configPath, "utf8");
          const config = JSON.parse(configData);

          // Extract repository paths
          if (config && config.repositories) {
            return config.repositories.map((repo) => repo.path);
          }

          return [];
        } catch (error) {
          return [];
        }
      };

      // Scan directories for Git repositories
      const scanDirectoriesForRepos = (
        directories: string[],
        maxDepth = 2,
      ): Repository[] => {
        const repositories: Repository[] = [];

        const scanDirectory = (dirPath: string, currentDepth: number): void => {
          // Stop if we've reached max depth
          if (currentDepth > maxDepth) {
            return;
          }

          try {
            // Check if current directory is a GitHub repository
            if (isGitRepo(dirPath) && hasGitHubRemote(dirPath)) {
              const repoInfo = getRepoDetails(dirPath);
              if (repoInfo) {
                repositories.push(repoInfo);
              }

              // Don't scan subdirectories of Git repositories
              return;
            }

            // Scan subdirectories
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
              if (entry.isDirectory() && !entry.name.startsWith(".")) {
                const subDirPath = path.join(dirPath, entry.name);
                scanDirectory(subDirPath, currentDepth + 1);
              }
            }
          } catch (error) {
            // Silently ignore permission errors
          }
        };

        // Process each directory
        for (const dir of directories) {
          scanDirectory(dir, 0);
        }

        return repositories;
      };

      // Main function to scan for repositories
      const scanLocalRepositories = (): Repository[] => {
        // Get common locations
        const commonLocations = getCommonRepoLocations();

        // Get GitHub Desktop locations
        const desktopLocations = getGitHubDesktopLocations();

        // Scan common locations
        const commonRepos = scanDirectoriesForRepos(commonLocations);

        // Process GitHub Desktop repositories
        const desktopRepos: Repository[] = [];
        for (const location of desktopLocations) {
          if (isGitRepo(location) && hasGitHubRemote(location)) {
            const repoInfo = getRepoDetails(location);
            if (repoInfo) {
              repoInfo.isGitHubDesktop = true;
              desktopRepos.push(repoInfo);
            }
          }
        }

        // Combine and deduplicate repositories
        const allRepos = [...desktopRepos, ...commonRepos];
        const uniqueRepos = allRepos.filter(
          (repo, index, self) =>
            index === self.findIndex((r) => r.path === repo.path),
        );

        return uniqueRepos;
      };

      // Scan for repositories
      const repositories = scanLocalRepositories();

      // Format the response
      let responseText = `Found ${repositories.length} GitHub repositories:\n\n`;

      if (repositories.length === 0) {
        responseText = "No GitHub repositories found on this system.";
      } else {
        repositories.forEach((repo, index) => {
          responseText += `${index + 1}. ${repo.name}\n`;
          responseText += `   Path: ${repo.path}\n`;
          if (repo.remote) responseText += `   Remote: ${repo.remote}\n`;
          if (repo.branch) responseText += `   Branch: ${repo.branch}\n`;
          if (repo.lastCommit && repo.lastCommit.hash) {
            responseText += `   Last Commit: ${repo.lastCommit.hash} - ${repo.lastCommit.message} (${repo.lastCommit.date})\n`;
          }
          if (repo.isGitHubDesktop)
            responseText += `   Managed by GitHub Desktop\n`;
          responseText += "\n";
        });
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
        repositories: repositories,
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing GitHub repositories: ${error.message || String(error)}`,
          },
        ],
        error: error.message || String(error),
      };
    }
  },
);

server.tool(
  "github_add_repository",
  "Add a local GitHub repository to the system.",
  {
    name: z.string(),
    path: z.string(),
    description: z.string().optional(),
  },
  async ({ name, path: repoPath, description }) => {
    try {
      // Import required modules
      const fs = (await import("fs")).default;
      const { execSync } = await import("child_process");
      const nodePath = await import("path");

      // Check if the path exists
      if (!fs.existsSync(repoPath)) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path does not exist: ${repoPath}`,
            },
          ],
          success: false,
          error: "Path does not exist",
        };
      }

      // Check if it's a Git repository
      const gitDir = nodePath.join(repoPath, ".git");
      if (!fs.existsSync(gitDir)) {
        return {
          content: [
            { type: "text", text: `Not a Git repository: ${repoPath}` },
          ],
          success: false,
          error: "Not a Git repository",
        };
      }

      // Check if it has a GitHub remote
      let hasGitHubRemote = false;
      let remoteUrl = "";
      try {
        const remotes = execSync("git remote -v", {
          cwd: repoPath,
          encoding: "utf8",
        });
        hasGitHubRemote = remotes.includes("github.com");

        if (hasGitHubRemote) {
          // Extract the GitHub remote URL
          const remoteMatch = remotes.match(
            /origin\s+(https:\/\/github\.com\/[^\s]+|git@github\.com:[^\s]+)/,
          );
          remoteUrl = remoteMatch ? remoteMatch[1] : "";
        }
      } catch (error) {
        // Ignore errors
      }

      // Get current branch
      let branch = "";
      try {
        branch = execSync("git rev-parse --abbrev-ref HEAD", {
          cwd: repoPath,
          encoding: "utf8",
        }).trim();
      } catch (error) {
        // Ignore errors
      }

      // Create a description if not provided
      const repoDescription =
        description ||
        `Local GitHub repository: ${name} (${branch || "unknown branch"})`;

      // Make an API call to add the repository to the system
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(
        "http://localhost:3000/api/github/add-local-repo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            repoPath,
            description: repoDescription,
            remote: remoteUrl,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            { type: "text", text: `Failed to add repository: ${errorText}` },
          ],
          success: false,
          error: errorText,
        };
      }

      const result = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `Successfully added GitHub repository: ${name}\nPath: ${repoPath}\nDescription: ${repoDescription}`,
          },
        ],
        success: true,
        repository: result.repository,
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error adding GitHub repository: ${error.message}`,
          },
        ],
        success: false,
        error: error.message,
      };
    }
  },
);

server.tool(
  "github_remove_repository",
  "Remove a GitHub repository from the system.",
  {
    id: z.string(),
  },
  async ({ id }) => {
    return { content: [{ type: "text", text: "GitHub repository removed" }] };
  },
);

server.tool(
  "github_pull_repository",
  "Pull the latest changes from the remote repository.",
  {
    repository_id: z.string(),
    branch: z.string().optional(),
  },
  async ({ repository_id, branch }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;
      const { execSync } = await import("child_process");

      // First, get the repository details
      const response = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await response.json();

      if (!repo.path) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path not found for ID: ${repository_id}`,
            },
          ],
          success: false,
          error: "Repository path not found",
        };
      }

      // Execute git pull command
      try {
        let command = "git pull";
        if (branch) {
          command = `git pull origin ${branch}`;
        }

        const output = execSync(command, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully pulled latest changes for ${repo.name}:\n\n${output}`,
            },
          ],
          success: true,
          output,
        };
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error pulling repository: ${errorMessage}`,
            },
          ],
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error pulling repository: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_push_repository",
  "Push local changes to the remote repository.",
  {
    repository_id: z.string(),
    branch: z.string().optional(),
    message: z.string().optional(),
  },
  async ({ repository_id, branch, message }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;
      const { execSync } = await import("child_process");

      // First, get the repository details
      const response = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await response.json();

      if (!repo.path) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path not found for ID: ${repository_id}`,
            },
          ],
          success: false,
          error: "Repository path not found",
        };
      }

      // Check if there are changes to commit
      try {
        const statusOutput = execSync("git status --porcelain", {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        if (statusOutput.trim() === "") {
          return {
            content: [
              {
                type: "text",
                text: `No changes to commit in ${repo.name}`,
              },
            ],
            success: true,
            noChanges: true,
          };
        }

        // If there are changes and a commit message is provided, commit them
        if (message) {
          execSync(`git add .`, {
            cwd: repo.path,
            encoding: "utf8",
            stdio: "pipe",
          });

          execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
            cwd: repo.path,
            encoding: "utf8",
            stdio: "pipe",
          });
        }

        // Push changes
        let pushCommand = "git push";
        if (branch) {
          pushCommand = `git push origin ${branch}`;
        }

        const output = execSync(pushCommand, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully pushed changes for ${repo.name}:\n\n${output}`,
            },
          ],
          success: true,
          output,
        };
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error pushing repository: ${errorMessage}`,
            },
          ],
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error pushing repository: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_sync_repository",
  "Synchronize a repository by pulling and then pushing changes.",
  {
    repository_id: z.string(),
    branch: z.string().optional(),
    message: z.string().optional(),
  },
  async ({ repository_id, branch, message }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;
      const { execSync } = await import("child_process");

      // First, get the repository details
      const response = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await response.json();

      if (!repo.path) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path not found for ID: ${repository_id}`,
            },
          ],
          success: false,
          error: "Repository path not found",
        };
      }

      // Check for local changes
      const statusOutput = execSync("git status --porcelain", {
        cwd: repo.path,
        encoding: "utf8",
        stdio: "pipe",
      });

      const hasLocalChanges = statusOutput.trim() !== "";

      // If there are changes and a commit message is provided, commit them
      if (hasLocalChanges && message) {
        execSync(`git add .`, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });
      }

      // Pull changes
      let pullCommand = "git pull";
      if (branch) {
        pullCommand = `git pull origin ${branch}`;
      }

      let pullOutput;
      try {
        pullOutput = execSync(pullCommand, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });
      } catch (pullError: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error pulling changes: ${pullError.message}\n\nPlease resolve conflicts manually.`,
            },
          ],
          success: false,
          error: pullError.message,
        };
      }

      // Push changes if there were local changes
      let pushOutput = "";
      if (hasLocalChanges) {
        let pushCommand = "git push";
        if (branch) {
          pushCommand = `git push origin ${branch}`;
        }

        try {
          pushOutput = execSync(pushCommand, {
            cwd: repo.path,
            encoding: "utf8",
            stdio: "pipe",
          });
        } catch (pushError: any) {
          return {
            content: [
              {
                type: "text",
                text: `Successfully pulled changes but error pushing: ${pushError.message}`,
              },
            ],
            success: false,
            pullSuccess: true,
            pushError: pushError.message,
          };
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully synchronized ${repo.name}:\n\nPull:\n${pullOutput}\n\n${hasLocalChanges ? `Push:\n${pushOutput}` : "No local changes to push."}`,
          },
        ],
        success: true,
        pullOutput,
        pushOutput: hasLocalChanges ? pushOutput : null,
        hadLocalChanges: hasLocalChanges,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error synchronizing repository: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_index_repository",
  "Index or re-index a GitHub repository.",
  {
    id: z.string(),
  },
  async ({ id }) => {
    try {
      // Make an API call to index the repository
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(
        `http://localhost:3000/api/github/${id}/index`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            { type: "text", text: `Failed to index repository: ${errorText}` },
          ],
          success: false,
          error: errorText,
        };
      }

      const result = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `Successfully indexed repository: ${result.indexedCount} files indexed`,
          },
        ],
        success: true,
        indexedCount: result.indexedCount,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error indexing GitHub repository: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_list_branches",
  "List all branches in a GitHub repository.",
  {
    repository_id: z.string(),
  },
  async ({ repository_id }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;
      const { execSync } = await import("child_process");

      // First, get the repository details
      const response = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await response.json();

      if (!repo.path) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path not found for ID: ${repository_id}`,
            },
          ],
          success: false,
          error: "Repository path not found",
        };
      }

      // Get all branches
      try {
        // Get local branches
        const localBranchesOutput = execSync("git branch", {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        // Get remote branches
        const remoteBranchesOutput = execSync("git branch -r", {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        // Parse branches
        const localBranches = localBranchesOutput
          .split("\n")
          .map((branch) => branch.trim())
          .filter((branch) => branch)
          .map((branch) => {
            const isCurrent = branch.startsWith("*");
            const name = isCurrent ? branch.substring(1).trim() : branch;
            return { name, isCurrent, isLocal: true };
          });

        const remoteBranches = remoteBranchesOutput
          .split("\n")
          .map((branch) => branch.trim())
          .filter((branch) => branch)
          .map((branch) => {
            // Remove 'origin/' prefix
            const name = branch.startsWith("origin/")
              ? branch.substring(7)
              : branch;
            return { name, isCurrent: false, isRemote: true };
          });

        // Define the branch type
        interface Branch {
          name: string;
          isCurrent: boolean;
          isLocal?: boolean;
          isRemote?: boolean;
        }

        // Combine branches and remove duplicates
        const allBranches: Branch[] = [];
        const branchNames = new Set();

        // Add local branches first
        for (const branch of localBranches) {
          allBranches.push(branch);
          branchNames.add(branch.name);
        }

        // Add remote branches that don't have a local counterpart
        for (const branch of remoteBranches) {
          if (!branchNames.has(branch.name)) {
            allBranches.push(branch);
            branchNames.add(branch.name);
          }
        }

        // Format the response
        let responseText = `Branches in ${repo.name}:\n\n`;

        if (allBranches.length === 0) {
          responseText = `No branches found in ${repo.name}.`;
        } else {
          // Group branches
          const currentBranch = allBranches.find((branch) => branch.isCurrent);
          const otherBranches = allBranches.filter(
            (branch) => !branch.isCurrent,
          );

          // Show current branch first
          if (currentBranch) {
            responseText += `Current branch: ${currentBranch.name} ${currentBranch.isLocal ? "(local)" : "(remote)"}\n\n`;
          }

          // Show other branches
          responseText += `All branches:\n`;
          otherBranches.forEach((branch, index) => {
            const branchType = [];
            if (branch.isLocal) branchType.push("local");
            if (branch.isRemote) branchType.push("remote");

            responseText += `${index + 1}. ${branch.name} (${branchType.join(", ")})\n`;
          });
        }

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
          success: true,
          branches: allBranches,
        };
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error listing branches: ${errorMessage}`,
            },
          ],
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing branches: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_create_branch",
  "Create a new branch in a GitHub repository.",
  {
    repository_id: z.string(),
    branch_name: z.string(),
    base_branch: z.string().optional(),
  },
  async ({ repository_id, branch_name, base_branch }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;
      const { execSync } = await import("child_process");

      // First, get the repository details
      const response = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await response.json();

      if (!repo.path) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path not found for ID: ${repository_id}`,
            },
          ],
          success: false,
          error: "Repository path not found",
        };
      }

      try {
        // Check if branch already exists
        const branchesOutput = execSync("git branch", {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        const branches = branchesOutput
          .split("\n")
          .map((branch) => branch.trim().replace(/^\* /, ""))
          .filter((branch) => branch);

        if (branches.includes(branch_name)) {
          return {
            content: [
              {
                type: "text",
                text: `Branch '${branch_name}' already exists in ${repo.name}`,
              },
            ],
            success: false,
            error: "Branch already exists",
          };
        }

        // If base branch is specified, checkout that branch first
        if (base_branch) {
          execSync(`git checkout ${base_branch}`, {
            cwd: repo.path,
            encoding: "utf8",
            stdio: "pipe",
          });
        }

        // Create new branch
        execSync(`git checkout -b ${branch_name}`, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        // Push branch to remote
        const pushOutput = execSync(`git push -u origin ${branch_name}`, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully created branch '${branch_name}' in ${repo.name} and pushed to remote:\n\n${pushOutput}`,
            },
          ],
          success: true,
          branchName: branch_name,
          pushOutput,
        };
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating branch: ${errorMessage}`,
            },
          ],
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating branch: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_switch_branch",
  "Switch to a different branch in a GitHub repository.",
  {
    repository_id: z.string(),
    branch_name: z.string(),
  },
  async ({ repository_id, branch_name }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;
      const { execSync } = await import("child_process");

      // First, get the repository details
      const response = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await response.json();

      if (!repo.path) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path not found for ID: ${repository_id}`,
            },
          ],
          success: false,
          error: "Repository path not found",
        };
      }

      try {
        // Check if there are uncommitted changes
        const statusOutput = execSync("git status --porcelain", {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        const hasUncommittedChanges = statusOutput.trim() !== "";

        if (hasUncommittedChanges) {
          return {
            content: [
              {
                type: "text",
                text: `Cannot switch branches: You have uncommitted changes in ${repo.name}. Please commit or stash your changes first.`,
              },
            ],
            success: false,
            error: "Uncommitted changes",
            hasUncommittedChanges,
          };
        }

        // Check if branch exists locally
        const branchesOutput = execSync("git branch", {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        const localBranches = branchesOutput
          .split("\n")
          .map((branch) => branch.trim().replace(/^\* /, ""))
          .filter((branch) => branch);

        let checkoutCommand;
        if (localBranches.includes(branch_name)) {
          // Branch exists locally, just checkout
          checkoutCommand = `git checkout ${branch_name}`;
        } else {
          // Check if branch exists remotely
          const remoteBranchesOutput = execSync("git branch -r", {
            cwd: repo.path,
            encoding: "utf8",
            stdio: "pipe",
          });

          const remoteBranches = remoteBranchesOutput
            .split("\n")
            .map((branch) => branch.trim())
            .filter((branch) => branch)
            .map((branch) =>
              branch.startsWith("origin/") ? branch.substring(7) : branch,
            );

          if (remoteBranches.includes(branch_name)) {
            // Branch exists remotely, checkout and track
            checkoutCommand = `git checkout -b ${branch_name} origin/${branch_name}`;
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `Branch '${branch_name}' does not exist locally or remotely in ${repo.name}`,
                },
              ],
              success: false,
              error: "Branch not found",
            };
          }
        }

        // Switch branch
        const output = execSync(checkoutCommand, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully switched to branch '${branch_name}' in ${repo.name}:\n\n${output}`,
            },
          ],
          success: true,
          branchName: branch_name,
          output,
        };
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error switching branch: ${errorMessage}`,
            },
          ],
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error switching branch: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_search_code",
  "Search for code in GitHub repositories.",
  {
    query: z.string(),
    repository_id: z.string().optional(),
  },
  async ({ query, repository_id }) => {
    try {
      // Make an API call to search code in repositories
      const fetch = (await import("node-fetch")).default;
      const url = new URL("http://localhost:3000/api/github/search");
      url.searchParams.append("q", query);
      if (repository_id) {
        url.searchParams.append("repositoryId", repository_id);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            { type: "text", text: `Failed to search code: ${errorText}` },
          ],
          success: false,
          error: errorText,
        };
      }

      const results = await response.json();

      // Format the response
      let responseText = `Found ${results.length} results for "${query}":\n\n`;

      if (results.length === 0) {
        responseText = `No results found for "${query}".`;
      } else {
        results.forEach((result, index) => {
          responseText += `${index + 1}. ${result.repositoryName}/${result.filePath}\n`;

          // Add a snippet of the content if available
          if (result.content) {
            // Extract a snippet around the match
            const lines = result.content.split("\n");
            const matchIndex = lines.findIndex((line) =>
              line.toLowerCase().includes(query.toLowerCase()),
            );

            if (matchIndex !== -1) {
              const startLine = Math.max(0, matchIndex - 2);
              const endLine = Math.min(lines.length - 1, matchIndex + 2);

              responseText += "```\n";
              for (let i = startLine; i <= endLine; i++) {
                const linePrefix = i === matchIndex ? "> " : "  ";
                responseText += `${linePrefix}${lines[i]}\n`;
              }
              responseText += "```\n";
            }
          }

          responseText += "\n";
        });
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
        success: true,
        results: results,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error searching GitHub code: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_commit_history",
  "Get commit history for a GitHub repository.",
  {
    repository_id: z.string(),
    branch: z.string().optional(),
    limit: z.number().optional(),
    path: z.string().optional(),
  },
  async ({ repository_id, branch, limit = 10, path }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;
      const { execSync } = await import("child_process");

      // First, get the repository details
      const response = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await response.json();

      if (!repo.path) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path not found for ID: ${repository_id}`,
            },
          ],
          success: false,
          error: "Repository path not found",
        };
      }

      try {
        // Build git log command
        let command = `git log --pretty=format:"%h|%an|%ad|%s" --date=relative`;

        // Add branch if specified
        if (branch) {
          command += ` ${branch}`;
        }

        // Add path if specified
        if (path) {
          command += ` -- ${path}`;
        }

        // Add limit
        command += ` -${limit}`;

        // Execute command
        const output = execSync(command, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        // Parse commits
        const commits = output
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            const [hash, author, date, ...messageParts] = line.split("|");
            const message = messageParts.join("|"); // In case commit message contains '|'
            return { hash, author, date, message };
          });

        // Format the response
        let responseText = `Commit history for ${repo.name}`;
        if (branch) responseText += ` (${branch})`;
        if (path) responseText += ` - ${path}`;
        responseText += `:\n\n`;

        if (commits.length === 0) {
          responseText = `No commits found for ${repo.name}`;
          if (branch) responseText += ` (${branch})`;
          if (path) responseText += ` - ${path}`;
          responseText += `.`;
        } else {
          commits.forEach((commit, index) => {
            responseText += `${index + 1}. ${commit.hash} - ${commit.message}\n`;
            responseText += `   Author: ${commit.author}, ${commit.date}\n\n`;
          });
        }

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
          success: true,
          commits,
        };
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting commit history: ${errorMessage}`,
            },
          ],
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting commit history: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_view_commit",
  "View details of a specific commit in a GitHub repository.",
  {
    repository_id: z.string(),
    commit_hash: z.string(),
  },
  async ({ repository_id, commit_hash }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;
      const { execSync } = await import("child_process");

      // First, get the repository details
      const response = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await response.json();

      if (!repo.path) {
        return {
          content: [
            {
              type: "text",
              text: `Repository path not found for ID: ${repository_id}`,
            },
          ],
          success: false,
          error: "Repository path not found",
        };
      }

      try {
        // Get commit details
        const commitDetails = execSync(
          `git show --pretty=format:"%h|%an|%ae|%ad|%s" --date=iso ${commit_hash}`,
          {
            cwd: repo.path,
            encoding: "utf8",
            stdio: "pipe",
          },
        );

        // Parse commit details
        const firstLine = commitDetails.split("\n")[0];
        const [hash, author, email, date, ...messageParts] =
          firstLine.split("|");
        const message = messageParts.join("|"); // In case commit message contains '|'

        // Get commit diff
        const diff = execSync(`git show --stat --patch ${commit_hash}`, {
          cwd: repo.path,
          encoding: "utf8",
          stdio: "pipe",
        });

        // Format the response
        const responseText =
          `Commit ${hash} in ${repo.name}:\n\n` +
          `Author: ${author} <${email}>\n` +
          `Date: ${date}\n` +
          `Message: ${message}\n\n` +
          `Changes:\n\n` +
          `\`\`\`diff\n${diff}\n\`\`\``;

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
          success: true,
          commit: {
            hash,
            author,
            email,
            date,
            message,
            diff,
          },
        };
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error viewing commit: ${errorMessage}`,
            },
          ],
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error viewing commit: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_get_file",
  "Get the content of a file from a GitHub repository.",
  {
    repository_id: z.string(),
    file_path: z.string(),
  },
  async ({ repository_id, file_path }) => {
    try {
      // Make an API call to get the file content
      const fetch = (await import("node-fetch")).default;
      const path = await import("path");
      const url = new URL(
        `http://localhost:3000/api/github/${repository_id}/file`,
      );
      url.searchParams.append("path", file_path);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [{ type: "text", text: `Failed to get file: ${errorText}` }],
          success: false,
          error: errorText,
        };
      }

      const result = await response.json();

      // Determine the language for syntax highlighting
      const extension = path.extname(file_path).toLowerCase().substring(1);
      let language = "";

      // Map common extensions to languages
      const languageMap = {
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

      // Format the response
      const responseText = `File: ${file_path}\n\n\`\`\`${language}\n${result.content}\n\`\`\`\n`;

      return {
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
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving file: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_list_pull_requests",
  "List pull requests for a GitHub repository.",
  {
    repository_id: z.string(),
    state: z.enum(["open", "closed", "all"]).optional(),
  },
  async ({ repository_id, state = "open" }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;

      // First, get the repository details
      const repoResponse = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!repoResponse.ok) {
        const errorText = await repoResponse.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await repoResponse.json();

      // Get GitHub account for authentication
      const accountResponse = await fetch(
        `http://localhost:3000/api/github/account`,
      );

      if (!accountResponse.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to get GitHub account. Please connect your GitHub account first.`,
            },
          ],
          success: false,
          error: "GitHub account not connected",
        };
      }

      const account = await accountResponse.json();

      if (!account.accessToken) {
        return {
          content: [
            {
              type: "text",
              text: `GitHub account is connected but no access token is available.`,
            },
          ],
          success: false,
          error: "No GitHub access token",
        };
      }

      // Extract owner and repo name from remote URL
      let owner, repoName;

      if (repo.url) {
        // Try to extract from URL
        const match = repo.url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
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
          [owner, repoName] = repo.name.split("/");
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Could not determine GitHub repository owner and name from repository information.`,
              },
            ],
            success: false,
            error: "Could not determine repository owner and name",
          };
        }
      }

      // Fetch pull requests from GitHub API
      const prResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/pulls?state=${state}`,
        {
          headers: {
            Authorization: `token ${account.accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (!prResponse.ok) {
        const errorText = await prResponse.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch pull requests: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const pullRequests = await prResponse.json();

      // Format the response
      let responseText = `${pullRequests.length} ${state} pull requests for ${owner}/${repoName}:\n\n`;

      if (pullRequests.length === 0) {
        responseText = `No ${state} pull requests found for ${owner}/${repoName}.`;
      } else {
        pullRequests.forEach((pr, index) => {
          responseText += `${index + 1}. #${pr.number}: ${pr.title}\n`;
          responseText += `   Created by ${pr.user.login} on ${new Date(pr.created_at).toLocaleDateString()}\n`;
          responseText += `   ${pr.html_url}\n\n`;
        });
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
        success: true,
        pullRequests,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing pull requests: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_create_pull_request",
  "Create a new pull request in a GitHub repository.",
  {
    repository_id: z.string(),
    title: z.string(),
    head: z.string(),
    base: z.string(),
    body: z.string().optional(),
  },
  async ({ repository_id, title, head, base, body = "" }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;

      // First, get the repository details
      const repoResponse = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!repoResponse.ok) {
        const errorText = await repoResponse.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await repoResponse.json();

      // Get GitHub account for authentication
      const accountResponse = await fetch(
        `http://localhost:3000/api/github/account`,
      );

      if (!accountResponse.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to get GitHub account. Please connect your GitHub account first.`,
            },
          ],
          success: false,
          error: "GitHub account not connected",
        };
      }

      const account = await accountResponse.json();

      if (!account.accessToken) {
        return {
          content: [
            {
              type: "text",
              text: `GitHub account is connected but no access token is available.`,
            },
          ],
          success: false,
          error: "No GitHub access token",
        };
      }

      // Extract owner and repo name from remote URL
      let owner, repoName;

      if (repo.url) {
        // Try to extract from URL
        const match = repo.url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
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
          [owner, repoName] = repo.name.split("/");
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Could not determine GitHub repository owner and name from repository information.`,
              },
            ],
            success: false,
            error: "Could not determine repository owner and name",
          };
        }
      }

      // Create pull request via GitHub API
      const prResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/pulls`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${account.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            head,
            base,
            body,
          }),
        },
      );

      if (!prResponse.ok) {
        const errorData = await prResponse.json();
        return {
          content: [
            {
              type: "text",
              text: `Failed to create pull request: ${errorData.message || prResponse.statusText}`,
            },
          ],
          success: false,
          error: errorData.message || prResponse.statusText,
        };
      }

      const pullRequest = await prResponse.json();

      return {
        content: [
          {
            type: "text",
            text: `Successfully created pull request #${pullRequest.number}: ${pullRequest.title}\n\nURL: ${pullRequest.html_url}`,
          },
        ],
        success: true,
        pullRequest,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating pull request: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "github_view_pull_request",
  "View details of a specific pull request in a GitHub repository.",
  {
    repository_id: z.string(),
    pull_number: z.number(),
  },
  async ({ repository_id, pull_number }) => {
    try {
      // Import required modules
      const fetch = (await import("node-fetch")).default;

      // First, get the repository details
      const repoResponse = await fetch(
        `http://localhost:3000/api/github/${repository_id}`,
      );

      if (!repoResponse.ok) {
        const errorText = await repoResponse.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to get repository details: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const repo = await repoResponse.json();

      // Get GitHub account for authentication
      const accountResponse = await fetch(
        `http://localhost:3000/api/github/account`,
      );

      if (!accountResponse.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to get GitHub account. Please connect your GitHub account first.`,
            },
          ],
          success: false,
          error: "GitHub account not connected",
        };
      }

      const account = await accountResponse.json();

      if (!account.accessToken) {
        return {
          content: [
            {
              type: "text",
              text: `GitHub account is connected but no access token is available.`,
            },
          ],
          success: false,
          error: "No GitHub access token",
        };
      }

      // Extract owner and repo name from remote URL
      let owner, repoName;

      if (repo.url) {
        // Try to extract from URL
        const match = repo.url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
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
          [owner, repoName] = repo.name.split("/");
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Could not determine GitHub repository owner and name from repository information.`,
              },
            ],
            success: false,
            error: "Could not determine repository owner and name",
          };
        }
      }

      // Fetch pull request details from GitHub API
      const prResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/pulls/${pull_number}`,
        {
          headers: {
            Authorization: `token ${account.accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (!prResponse.ok) {
        const errorText = await prResponse.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch pull request: ${errorText}`,
            },
          ],
          success: false,
          error: errorText,
        };
      }

      const pr = await prResponse.json();

      // Format the response
      const createdDate = new Date(pr.created_at).toLocaleString();
      const updatedDate = new Date(pr.updated_at).toLocaleString();

      let responseText = `Pull Request #${pr.number}: ${pr.title}\n\n`;
      responseText += `Status: ${pr.state} ${pr.merged ? "(merged)" : ""}\n`;
      responseText += `Author: ${pr.user.login}\n`;
      responseText += `Created: ${createdDate}\n`;
      responseText += `Updated: ${updatedDate}\n`;
      responseText += `URL: ${pr.html_url}\n\n`;
      responseText += `Branches: ${pr.head.label} → ${pr.base.label}\n\n`;

      if (pr.body) {
        responseText += `Description:\n${pr.body}\n\n`;
      }

      // Fetch PR comments
      const commentsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/issues/${pull_number}/comments`,
        {
          headers: {
            Authorization: `token ${account.accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (commentsResponse.ok) {
        const comments = await commentsResponse.json();

        if (comments.length > 0) {
          responseText += `Comments (${comments.length}):\n\n`;
          comments.forEach((comment, index) => {
            responseText += `${comment.user.login} (${new Date(comment.created_at).toLocaleString()}):\n${comment.body}\n\n`;
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
        success: true,
        pullRequest: pr,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error viewing pull request: ${errorMessage}`,
          },
        ],
        success: false,
        error: errorMessage,
      };
    }
  },
);

server.tool(
  "idle",
  "A special tool to indicate completion of all tasks.",
  {},
  async () => {
    return { content: [{ type: "text", text: "Entering idle state" }] };
  },
);

// Connect the server to the transport
await server.connect(transport);
