import { insertCodeSnippetAction } from "@/app/api/code-snippets/actions";
import { callMcpToolAction } from "@/app/api/mcp/actions";
import { jsonSchema, tool } from "ai";
import logger from "logger";

// Define supported languages
const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "shell",
  "powershell",
  "batch",
  "ruby",
  "php",
  "go",
  "java",
  "c",
  "cpp",
  "csharp",
  "rust",
  "swift",
  "kotlin",
  "r",
  "perl",
  "lua",
  "sql",
];

/**
 * Code execution tool that connects to the MCP server
 * This allows AI models to execute code directly without requiring the user to mention the MCP tool
 */
export const codeExecutionTool = tool({
  name: "code_execute",
  description: "Execute code in a specified programming language",
  parameters: jsonSchema({
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The code to execute",
      },
      language: {
        type: "string",
        description: `The programming language. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`,
        enum: SUPPORTED_LANGUAGES,
      },
      save: {
        type: "boolean",
        description: "Whether to save the code snippet for future use",
        default: false,
      },
      title: {
        type: "string",
        description: "Title for the code snippet if saving",
      },
      description: {
        type: "string",
        description: "Description for the code snippet if saving",
      },
    },
    required: ["code", "language"],
    additionalProperties: false,
  }),
  execute: async ({ code, language, save, title, description }) => {
    try {
      logger.debug("Executing code via MCP server", { language });

      // Validate language
      if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase())) {
        return {
          success: false,
          error: `Unsupported language: ${language}. Supported languages are: ${SUPPORTED_LANGUAGES.join(", ")}`,
          message: `Unsupported language: ${language}. Supported languages are: ${SUPPORTED_LANGUAGES.join(", ")}`,
        };
      }

      // Call the MCP server to execute the code
      const result = await callMcpToolAction(
        "custom-mcp-server",
        "code_execute",
        { code, language: language.toLowerCase() },
      );

      // Save the code snippet if requested
      if (save && code) {
        try {
          const snippetTitle =
            title || `${language} snippet ${new Date().toLocaleString()}`;
          await insertCodeSnippetAction({
            title: snippetTitle,
            description: description || "",
            code,
            language: language.toLowerCase(),
            isFavorite: false,
          });

          // Add save confirmation to the result message
          const saveMessage = "\n\nCode snippet saved successfully.";

          if (result.success) {
            return {
              success: true,
              output: result.output,
              executionTime: result.executionTime,
              message: `Code executed successfully in ${result.executionTime}ms:\n\n${result.output || "No output"}${saveMessage}`,
              saved: true,
            };
          } else {
            return {
              success: false,
              error: result.error,
              output: result.output,
              message: `Error executing code: ${result.error}\n\n${result.output ? `Output: ${result.output}` : ""}${saveMessage}`,
              saved: true,
            };
          }
        } catch (saveError: any) {
          logger.error("Error saving code snippet:", saveError);
          // Continue with execution result but add save error message
          const saveErrorMessage =
            "\n\nFailed to save code snippet: " +
            (saveError.message || String(saveError));

          if (result.success) {
            return {
              success: true,
              output: result.output,
              executionTime: result.executionTime,
              message: `Code executed successfully in ${result.executionTime}ms:\n\n${result.output || "No output"}${saveErrorMessage}`,
              saved: false,
            };
          } else {
            return {
              success: false,
              error: result.error,
              output: result.output,
              message: `Error executing code: ${result.error}\n\n${result.output ? `Output: ${result.output}` : ""}${saveErrorMessage}`,
              saved: false,
            };
          }
        }
      }

      // Return normal result if not saving
      if (result.success) {
        return {
          success: true,
          output: result.output,
          executionTime: result.executionTime,
          message: `Code executed successfully in ${result.executionTime}ms:\n\n${result.output || "No output"}`,
        };
      } else {
        return {
          success: false,
          error: result.error,
          output: result.output,
          message: `Error executing code: ${result.error}\n\n${result.output ? `Output: ${result.output}` : ""}`,
        };
      }
    } catch (error: any) {
      logger.error("Error executing code:", error);
      return {
        success: false,
        error: error.message || String(error),
        message: `Failed to execute code: ${error.message || String(error)}`,
      };
    }
  },
});

/**
 * Tool to save a code snippet without executing it
 */
export const saveCodeSnippetTool = tool({
  name: "save_code_snippet",
  description: "Save a code snippet for future reference without executing it",
  parameters: jsonSchema({
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The code to save",
      },
      language: {
        type: "string",
        description: `The programming language. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`,
        enum: SUPPORTED_LANGUAGES,
      },
      title: {
        type: "string",
        description: "Title for the code snippet",
      },
      description: {
        type: "string",
        description: "Description for the code snippet",
      },
      tags: {
        type: "string",
        description: "Comma-separated tags for the code snippet",
      },
      isFavorite: {
        type: "boolean",
        description: "Whether to mark the snippet as a favorite",
        default: false,
      },
    },
    required: ["code", "language"],
    additionalProperties: false,
  }),
  execute: async ({ code, language, title, description, tags, isFavorite }) => {
    try {
      const snippetTitle =
        title || `${language} snippet ${new Date().toLocaleString()}`;

      const snippet = await insertCodeSnippetAction({
        title: snippetTitle,
        description: description || "",
        code,
        language: language.toLowerCase(),
        tags,
        isFavorite: isFavorite || false,
      });

      return {
        success: true,
        message: `Code snippet "${snippetTitle}" saved successfully.`,
        snippet,
      };
    } catch (error: any) {
      logger.error("Error saving code snippet:", error);
      return {
        success: false,
        error: error.message || String(error),
        message: `Failed to save code snippet: ${error.message || String(error)}`,
      };
    }
  },
});

/**
 * Collection of all AI tools that can be used directly by AI models
 */
export const aiTools = {
  code_execute: codeExecutionTool,
  save_code_snippet: saveCodeSnippetTool,
};
