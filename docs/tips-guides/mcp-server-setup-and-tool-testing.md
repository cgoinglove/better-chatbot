# 🔧 MCP Server Configuration Guide

> This guide explains how to add MCP servers by defining their configuration in JSON format. Each MCP server entry is stored in the database and supports different transport types: `stdio`, `SSE`, and `StreamableHTTP`.

You can add new MCP servers effortlessly through the UI — no need to restart the app. Each tool is available instantly and can be tested independently outside of chat. This is perfect for quick debugging and reliable development workflows.

![add-mcp-server](https://github.com/user-attachments/assets/f66ae118-883e-4638-b4fc-9f9849566da2)

<br/>

## 🖥️ Stdio Type

Used for locally executed tools that run via a command-line interface.

**Example:**

```json
{
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

- `command`: Required. The CLI command to launch the server.
- `args`: Optional. A list of arguments to pass to the command.

## 🌐 SSE / StreamableHTTP Type

Used for remote servers that communicate via HTTP (SSE or streaming).

**Example:**

```json
{
  "url": "https://api.example.com",
  "headers": {
    "Authorization": "Bearer sk-..."
  }
}
```

- `url`: Required. The endpoint to connect to.
- `headers`: Optional. HTTP headers such as authorization tokens.

You don't need to specify the transport type manually — it is inferred based on the structure:

- If `command` is present → it's a `stdio` config
- If `url` is present → it's a `SSE` or `StreamableHTTP` config

## 💾 File-based Configuration (for local dev)

By default, MCP server configs are stored in the database.
However, for local development, you can also use a file-based approach by enabling the following setting:

```env
# Whether to use file-based MCP config (default: false)
FILE_BASED_MCP_CONFIG=true
```

Then, create a `.mcp-config.json` file in the project root and define your servers there. Example:

```jsonc
// .mcp-config.json
{
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"]
  }
}
```

Simply paste your configuration in the MCP Configuration form (or .mcp-config.json) to register a new tool.
