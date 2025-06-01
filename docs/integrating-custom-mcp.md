# Integrating Custom MCP Servers

## Introduction

This document provides guidance on integrating custom Master Control Program (MCP) servers with this chat application. MCPs allow the Large Language Model (LLM) to use external tools, extending its capabilities. Understanding how to configure and integrate custom MCPs is crucial for developers looking to add new functionalities.

## MCP Configuration Overview

The application supports two primary methods for configuring MCP servers:

1.  **File-Based Configuration:**
    *   If the environment variable `FILE_BASED_MCP_CONFIG` is set to `true` (or is not set, as it defaults to true), the application will load MCP configurations from a JSON file.
    *   The default path for this file is `.mcp-config.json` in the application root. This can be overridden by setting the `MCP_CONFIG_PATH` environment variable.
2.  **Database-Based Configuration:**
    *   If `FILE_BASED_MCP_CONFIG` is explicitly set to `false`, the application attempts to load MCP configurations from a database table (managed via `src/lib/ai/mcp/db-mcp-config-storage.ts`).

Regardless of the source, each MCP server configuration should conform to the `MCPServerConfig` TypeScript type. This type is a discriminated union based on the `protocol` field and includes:
*   `MCPSseConfig` (using `protocol: 'sse'`): For MCPs that communicate over HTTP/HTTPS, potentially using Server-Sent Events (SSE) for streaming. These are expected to be compliant with the Model Context Protocol.
*   `MCPStdioConfig` (using `protocol: 'stdio'`): For MCPs that are local command-line tools and communicate over standard input/output (stdio). These are also expected to be compliant with the Model Context Protocol.
*   `SimpleHttpMCPConfig` (using `protocol: 'simple-http'`): For simpler HTTP-based MCPs that might not be fully Model Context Protocol compliant, allowing for static tool definition and direct HTTP calls.

## Configuring a Custom HTTP-based MCP

There are two main approaches depending on the MCP server's capabilities:

### 1. Using `protocol: 'simple-http'` for Basic Endpoints (Example: AWS Jira MCP)

This approach is suitable for simple HTTP endpoints that may not implement the full Model Context Protocol (e.g., dynamic tool discovery). The `SimpleHttpClient` is used for these.

The following JSON snippet would be part of your `.mcp-config.json` file:

```json
{
  "jira-aws-mcp": {
    "protocol": "simple-http",
    "name": "Jira AWS MCP (Simple)",
    "description": "Handles Jira operations via a simple AWS Lambda endpoint.",
    "url": "https://<your-api-gateway-id>.execute-api.<your-region>.amazonaws.com/prod/mcp/execute",
    "headers": {
      "X-API-Key": "YOUR_JIRA_MCP_LAMBDA_API_KEY"
    },
    "tools": [
      {
        "name": "jira_create_ticket",
        "description": "Creates a new issue (ticket) in Jira. Requires project ID/key, summary, description (Atlassian Document Format), and issue type name. Optionally, priority can be specified.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "projectId": { "type": "string", "description": "The Jira project ID (e.g., '10000') or project key (e.g., 'PROJ')." },
            "summary": { "type": "string", "description": "The summary or title of the ticket." },
            "description": {
              "type": "object",
              "description": "The detailed description in Atlassian Document Format.",
              "properties": {
                "type": { "type": "string", "enum": ["doc"] },
                "version": { "type": "integer", "enum": [1] },
                "content": { "type": "array", "items": { "type": "object" } }
              },
              "required": ["type", "version", "content"]
            },
            "issueTypeName": { "type": "string", "description": "The name of the issue type (e.g., 'Task', 'Bug', 'Story'). Must match a type in your Jira project." },
            "priorityName": { "type": "string", "description": "Optional. The priority of the ticket (e.g., 'High', 'Medium', 'Low')." }
          },
          "required": ["projectId", "summary", "description", "issueTypeName"]
        }
      },
      {
        "name": "jira_read_ticket",
        "description": "Reads an issue or ticket details from Jira using its ID or key (e.g., 'PROJ-123').",
        "inputSchema": {
          "type": "object",
          "properties": {
            "issueIdOrKey": { "type": "string", "description": "The Jira issue ID or key (e.g., 'PROJ-123')." }
          },
          "required": ["issueIdOrKey"]
        }
      }
    ]
  }
}
```

**Explanation of this `simple-http` example:**
*   `"protocol": "simple-http"`: This crucial field tells the application to use the `SimpleHttpClient` for this MCP.
*   `"url"`: This must be the **exact and full URL** where the `SimpleHttpClient` will send its POST requests (e.g., your API Gateway endpoint for the Lambda function that executes the tool).
*   `"headers"`: Allows specifying custom headers, such as `X-API-Key`.
*   `"tools": [...]`: This array **statically defines the tools** offered by this MCP. The `SimpleHttpClient` reads tools directly from this array, bypassing any dynamic discovery. This is ideal for endpoints that don't support the Model Context Protocol's `/tools` discovery mechanism.

### 2. Using `protocol: 'sse'` for Model Context Protocol Compliant Endpoints

If you have an MCP server that is fully compliant with the Model Context Protocol (supports `/tools` for discovery and `/execute` for tool calls, potentially using SSE), you would use `protocol: 'sse'`.

```json
{
  "compliant-mcp-server": {
    "protocol": "sse",
    "name": "SDK Compliant MCP",
    "description": "An MCP server that adheres to the Model Context Protocol.",
    "url": "https://<your-compliant-mcp-base-url>", // Base URL for the MCP SDK
    "headers": {
      "Authorization": "Bearer <your-auth-token>"
    }
    // No 'tools' array here, as tools are discovered dynamically
  }
}
```
In this case, the `url` is the base URL for the SDK, and the `MCPClient` will append paths like `/tools` or `/execute`.

## MCP Client Implementations

The application now utilizes different client implementations based on the `protocol` specified in the MCP configuration:

1.  **`MCPClient` (for `protocol: 'sse'` or `protocol: 'stdio'`)**
    *   This is the standard client that uses the `@modelcontextprotocol/sdk`.
    *   It expects the remote MCP server to be compliant with the Model Context Protocol.
    *   **Tool Discovery:** It dynamically discovers tools by calling a `/tools` endpoint (or equivalent) on the remote server.
    *   **Communication:** It uses `StreamableHTTPClientTransport` or `SSEClientTransport` for `sse` protocols, and `StdioClientTransport` for `stdio`.

2.  **`SimpleHttpClient` (for `protocol: 'simple-http'`)**
    *   This client is designed for simpler HTTP endpoints that may not implement the full Model Context Protocol (especially dynamic tool discovery).
    *   It does **not** use the `@modelcontextprotocol/sdk` for communication.
    *   **Tool Definition:** It reads tool definitions directly from the `tools` array provided in its static configuration (e.g., in `.mcp-config.json`).
    *   **Communication:** It makes a direct HTTP POST request to the configured `url`. The request body is typically ` { "toolName": "<tool_name>", "parameters": { ... } } `.
    *   This client is suitable for integrating webhook-style MCP servers or simple AWS Lambda functions fronted by API Gateway, where you define the tools statically in the configuration.

## Tool Registration and LLM Availability

Regardless of the client type (`MCPClient` or `SimpleHttpClient`):

1.  **Tool Collection:** Each client instance makes its tools available (either through dynamic discovery for `MCPClient` or from static configuration for `SimpleHttpClient`).
2.  **Wrapping:** These tools (defined as `MCPToolInfo`) are then wrapped into AI SDK `Tool` objects. This makes them compatible with the LLM interaction library.
3.  **Aggregation:** The `MCPClientsManager` (from `src/lib/ai/mcp/mcp-manager.ts`) iterates through all configured and initialized MCP clients and collects their tools.
4.  **Prefixing:** To avoid naming conflicts if multiple MCPs offer tools with the same name, tool names are prefixed with the MCP's configuration key (e.g., `jira-aws-mcp_jira_create_ticket`). This is handled by the `createMCPToolId` utility.
5.  **LLM Availability:** This aggregated and prefixed list of tools is then passed to the LLM during chat interactions, allowing it to request their execution.

## Integrating "Simple" HTTP Endpoints (like the Jira Lambda)

With the introduction of `SimpleHttpMCPConfig` and `SimpleHttpClient`, integrating simple HTTP endpoints (like the AWS Jira Lambda example) is now straightforward:

1.  **Configure with `protocol: 'simple-http'`**:
    *   Set the `protocol` field to `"simple-http"` in your `.mcp-config.json` for that MCP.
    *   Provide the exact `url` for the POST request (e.g., your Lambda's API Gateway execution URL).
    *   Define all tools the endpoint can handle within the `tools` array in the configuration, including their `name`, `description`, and `inputSchema`.

2.  **Endpoint Requirements**:
    *   The HTTP endpoint must accept a `POST` request.
    *   It should expect a JSON body containing `toolName` (the name of the tool to execute) and `parameters` (an object of arguments for the tool).
    *   It should return a JSON response. For best results with `SimpleHttpClient`'s default parsing, the response should ideally be:
        *   The direct output of the tool if successful.
        *   Or, an object like `{ "success": true, "result": <actual_tool_output> }`.
        *   If an error occurs, it can return `{ "success": false, "error": "Error message", "details": { ... } }`. `SimpleHttpClient` will attempt to parse this and throw an error.

Using this approach, the need for the simple HTTP endpoint to be fully Model Context Protocol compliant (especially regarding dynamic tool discovery) is bypassed. The `SimpleHttpClient` handles the direct interaction based on the static configuration.

## Conclusion

Integrating custom MCPs significantly enhances the chat application's capabilities. The system now offers two main pathways for integration:
*   For **Model Context Protocol compliant servers**, use `protocol: 'sse'` (or `protocol: 'stdio'`) which leverages the `MCPClient` and its dynamic tool discovery.
*   For **simple HTTP endpoints**, use `protocol: 'simple-http'` with the `SimpleHttpClient`, providing static tool definitions in the configuration for direct invocation.

This dual approach provides flexibility, allowing developers to integrate a wider range of external tools and services with varying levels of protocol complexity.
