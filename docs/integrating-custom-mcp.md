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

Regardless of the source, each MCP server configuration should conform to the `MCPServerConfig` TypeScript type. This type has variants for different communication protocols:
*   `MCPSseConfig`: For MCPs that communicate over HTTP/HTTPS, potentially using Server-Sent Events (SSE) for streaming. This is the most common type for custom HTTP-based tools.
*   `MCPStdioConfig`: For MCPs that are local command-line tools and communicate over standard input/output (stdio).

## Configuring a Custom HTTP-based MCP (Example: AWS Jira MCP)

Let's consider an example of integrating an MCP hosted on AWS Lambda (for Jira operations), configured via the file-based method. The following JSON snippet would be part of your `.mcp-config.json` file:

```json
{
  "jira-aws-mcp": {
    "name": "Jira AWS MCP",
    "description": "Handles Jira operations via an AWS Lambda endpoint.",
    "type": "sse",
    "url": "https://<your-api-gateway-id>.execute-api.<your-region>.amazonaws.com/prod",
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

**Explanation of the example:**
*   `"jira-aws-mcp"`: A unique key for this MCP server.
*   `"type": "sse"`: Indicates this MCP uses HTTP-based communication, potentially with SSE. The `MCPClient` will use an HTTP transport from the `@modelcontextprotocol/sdk`.
*   `"url"`: This is the **base URL** for your API Gateway endpoint (e.g., `https://<your-api-gateway-id>.execute-api.<your-region>.amazonaws.com/prod`). The MCP client will append specific paths like `/tools` (for listing tools) or `/execute` (for calling tools) as per the Model Context Protocol.
*   `"headers"`: Allows specifying custom headers, such as `X-API-Key` for API Gateway authentication.
*   `"tools": [...]`: This array statically defines the tools offered by the MCP. **Crucially, the current `MCPClient` primarily relies on dynamic discovery of tools from the MCP server itself (via a `/tools` endpoint as per the Model Context Protocol).** This static `tools` array in the configuration is a proposed mechanism for scenarios where an MCP server might not support dynamic discovery. However, the existing client would need modification to use this static list directly if dynamic discovery fails or is not supported by the endpoint.

## How the `MCPClient` Works

The `MCPClient` (instantiated in `src/lib/ai/mcp/create-mcp-client.ts`) is responsible for managing communication with an MCP server.
*   For configurations with `type: "sse"` (like our Jira example), it utilizes transports from the `@modelcontextprotocol/sdk`, such as `StreamableHTTPClientTransport` or `SSEClientTransport`.
*   **A fundamental expectation is that the remote MCP server (the AWS Lambda in our example) is compliant with the Model Context Protocol.** This protocol defines how clients should interact with MCP servers, including how they discover available tools and how they request tool execution. Ideally, the remote server should implement:
    *   A `GET /tools` endpoint (or similar) to list available tools.
    *   A `POST /execute` endpoint (or similar) to call a specific tool.

## Tool Registration and LLM Availability

1.  **Discovery:** When an `MCPClient` is initialized, it typically attempts to discover the tools available on the remote MCP server by calling its equivalent of a `listTools()` method (e.g., by making a GET request to a `/tools` endpoint on the configured `url`).
2.  **Wrapping:** The discovered tools (which should conform to the `MCPToolDefinition` from the SDK) are then wrapped into AI SDK `Tool` objects. This makes them compatible with the LLM interaction library used by the application.
3.  **Aggregation:** The `MCPClientsManager` (from `src/lib/ai/mcp/mcp-manager.ts`) iterates through all configured and initialized MCP clients and calls their `tools()` method (which internally performs the discovery).
4.  **Prefixing:** To avoid naming conflicts if multiple MCPs offer tools with the same name, tool names are prefixed with the MCP's configuration key. For example, `jira_create_ticket` from the `jira-aws-mcp` becomes `jira-aws-mcp_jira_create_ticket`. This is handled by the `createMCPToolId` utility.
5.  **LLM Availability:** This aggregated and prefixed list of tools is then passed to the LLM during chat interactions, allowing it to request their execution.

## Integrating "Simple" HTTP Endpoints (like the Jira Lambda)

The AWS Jira Lambda example, as previously discussed, might have a single endpoint like `/mcp/execute` that expects a `toolName` and `parameters` in the request body. This is a "simple" HTTP tool provider and is **not fully compliant** with the Model Context Protocol's dynamic tool discovery mechanism out-of-the-box.

For seamless integration with the *current* `MCPClient` and `@modelcontextprotocol/sdk` which expect protocol compliance:

1.  **Required Adaptation (Server-Side):** The AWS Lambda (or any similar custom HTTP MCP) would ideally need to be modified to:
    *   Expose a `GET /tools` (or equivalent) endpoint that returns a list of its available tools in a format compatible with the `MCPToolDefinition` of the SDK.
    *   Structure its tool execution endpoint (e.g., `POST /execute`) to align with the protocol's expectations for tool calls.

2.  **Alternative (Client-Side Modification):** If modifying the remote MCP server is not feasible, the `MCPClient` within this application (or a new, specialized client type) could be extended to support such simple HTTP endpoints. This would involve:
    *   Reading the tool definitions directly from the static `tools` array provided in the `.mcp-config.json` (as shown in the Jira example). This would bypass the dynamic `listTools` call.
    *   Implementing a custom `callTool` method within this specialized client that constructs the request body (e.g., `{ "toolName": "jira_create_ticket", "parameters": { ... } }`) and POSTs it directly to the configured `url` (which might be the full path to the execution endpoint like `/mcp/execute`, or the client would append a fixed path).

Without these server-side adaptations or client-side modifications, integrating a simple HTTP endpoint that doesn't adhere to the Model Context Protocol's discovery and execution patterns will likely require custom code changes to ensure proper tool listing and invocation.

## Conclusion

Integrating custom MCPs extends the chat application's power. While the system is designed around the Model Context Protocol for robust and standardized communication (especially for tool discovery), understanding its current mechanisms and potential adaptations is key. For simple HTTP endpoints, developers should be prepared to either make their endpoints protocol-compliant or consider extending the client-side MCP handling logic to accommodate direct tool definitions and custom invocation methods.
