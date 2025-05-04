# Project Management with MCP Client Chatbot

## Overview

The MCP Client Chatbot is a versatile chat interface that supports various AI model providers. This use case explains how to build an agent that assists with project management tasks using the GitHub MCP server.


## ✅ Configuration

To use the GitHub MCP server, use the following configuration. The MCP server used here is the official GitHub MCP server. For more information, visit the [GitHub MCP Server repository](https://github.com/github/github-mcp-server).

```json
{
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "-e",
    "GITHUB_PERSONAL_ACCESS_TOKEN",
    "ghcr.io/github/github-mcp-server"
  ],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "<user-github-token>"
  }
}
```

## Setting Up the Project

1. **Create a New Project:**
   - Create a new project in the MCP Client Chatbot.
   - Write the system prompt to define the MCP server to be used, the background, and the roles, allowing you to create an agent that assists with specific tasks.

2. **Define the System Prompt:**
   - Define the following roles in the system prompt:
     - A brief description of the mcp-client-chatbot repository
     - Instructions to use the GitHub MCP server
     - Assign the role of a contributor managing this repository

![System Prompt Setup](https://github.com/user-attachments/assets/9cd1ffad-7a44-4ca7-9cfa-f00bc655a772)

## Demonstration

- **Example Interaction:**
  - When the user sends the message "check latest issue," the agent retrieves and summarizes the latest issue using the GitHub API.
  - Then, if the user instructs to "write a comment about the benefits," the agent writes the appropriate comment.

![Commenting on Issue](https://github.com/user-attachments/assets/dca87a09-9b5d-4918-bfbc-c44c9455418a)


In this project thread, the chatbot can provide significant assistance. It can directly merge PRs or perform reviews as well.

> This kind of workflow can effectively replace many of the repetitive tasks involved in managing a GitHub project.
