<img width="1647" alt="thumbnail" loading="lazy" src="https://github.com/user-attachments/assets/7b0f279a-8771-42a0-b8b6-128b3b1a076c" />

[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)
[![Local First](https://img.shields.io/badge/Local-First-blue)](https://localfirstweb.dev/)
[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cgoinglove/better-chatbot&env=BETTER_AUTH_SECRET&env=OPENAI_API_KEY&env=GOOGLE_GENERATIVE_AI_API_KEY&env=ANTHROPIC_API_KEY&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https://github.com/cgoinglove/better-chatbot/blob/main/.env.example&demo-title=better-chatbot&demo-description=An+Open-Source+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&products=[{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"}])

Our goal is to create the best possible chatbot UX — focusing on the joy and intuitiveness users feel when calling and interacting with AI tools.


See the experience in action in the [preview](#preview) below!

> Built with [Vercel AI SDK](https://sdk.vercel.ai) and [Next.js](https://nextjs.org/), this app adopts modern patterns for building AI chat interfaces. It leverages the power of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) to seamlessly integrate external tools into your chat experience. You can also create custom workflows that become callable tools in chat, allowing you to chain multiple MCP tools, LLM interactions, and logic into powerful automated sequences.

### Quick Start 🚀

```bash
# 1. Clone the repository

git clone https://github.com/cgoinglove/better-chatbot.git
cd better-chatbot

# 2. (Optional) Install pnpm if you don't have it

npm install -g pnpm

# 3. Install dependencies

pnpm i

# 4. (Optional) Start a local PostgreSQL instance

pnpm docker:pg

# If you already have your own PostgreSQL running, you can skip this step.
# In that case, make sure to update the PostgreSQL URL in your .env file.

# 5. Enter required information in the .env file

# The .env file is created automatically. Just fill in the required values.
# For the fastest setup, provide at least one LLM provider's API key (e.g., OPENAI_API_KEY, CLAUDE_API_KEY, GEMINI_API_KEY, etc.) and the PostgreSQL URL you want to use.

# 6. Start the server

pnpm build:local && pnpm start

# (Recommended for most cases. Ensures correct cookie settings.)
# For development mode with hot-reloading and debugging, you can use:
# pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to get started.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Preview](#preview)
  - [🧩 Browser Automation with Playwright MCP](#-browser-automation-with-playwright-mcp)
  - [🔗 Visual Workflows as Custom Tools](#-visual-workflows-as-custom-tools)
  - [🎙️ Realtime Voice Assistant + MCP Tools](#️-realtime-voice-assistant--mcp-tools)
  - [⚡️ Quick Tool Mentions (`@`) \& Presets](#️-quick-tool-mentions---presets)
  - [🧭 Tool Choice Mode](#-tool-choice-mode)
  - [🛠️ Default Tools](#️-default-tools)
    - [🌐 Web Search](#-web-search)
    - [⚡️ JS Executor](#️-js-executor)
- [Getting Started](#getting-started)
  - [Quick Start (Docker Compose Version) 🐳](#quick-start-docker-compose-version-)
  - [Quick Start (Local Version) 🚀](#quick-start-local-version-)
  - [Environment Variables](#environment-variables)
- [📘 Guides](#-guides)
    - [🔌 MCP Server Setup \& Tool Testing](#-mcp-server-setup--tool-testing)
    - [🐳 Docker Hosting Guide](#-docker-hosting-guide)
    - [▲ Vercel Hosting Guide](#-vercel-hosting-guide)
    - [🎯 System Prompts \& Chat Customization](#-system-prompts--chat-customization)
    - [🔐 OAuth Sign-In Setup](#-oauth-sign-in-setup)
    - [🕵🏿 Adding openAI like providers](#-adding-openai-like-providers)
- [💡 Tips](#-tips)
    - [🧠 Agentic Chatbot with Project Instructions](#-agentic-chatbot-with-project-instructions)
    - [💬 Temporary Chat Windows](#-temporary-chat-windows)
- [🗺️ Roadmap](#️-roadmap)
- [🙌 Contributing](#-contributing)
- [💬 Join Our Discord](#-join-our-discord)


> This project is evolving at lightning speed! ⚡️ We're constantly shipping new features and smashing bugs. **Star this repo** to join the ride and stay in the loop with the latest updates!

## Preview

Get a feel for the UX — here's a quick look at what's possible.

### 🧩 Browser Automation with Playwright MCP

![preview](https://github.com/user-attachments/assets/58b4c561-9b59-40db-9c62-9fd5aeea4432)

**Example:** Control a web browser using Microsoft's [playwright-mcp](https://github.com/microsoft/playwright-mcp) tool.

- The LLM autonomously decides how to use tools from the MCP server, calling them multiple times to complete a multi-step task and return a final message.

Sample prompt:

```prompt
1. Use the @tool('web-search') to look up information about “modelcontetprotocol.”  

2. Then, using : @mcp("playwright")
   - navigate Google (https://www.google.com)  
   - Click the “Login” button  
   - Enter my email address (neo.cgoing@gmail.com)  
   - Clock the "Next"  button
   - Close the browser
```

<br/>

### 🔗 Visual Workflows as Custom Tools

<img width="1755" alt="workflow" src="https://github.com/user-attachments/assets/afa895f0-cc59-4c2f-beb3-4b7a1dc1f891" loading="lazy" />

<img width="1567" alt="workflow-mention" loading="lazy" src="https://github.com/user-attachments/assets/cf3e1339-ee44-4615-a71d-f6b46833e41f" />

**Example:** Create custom workflows that become callable tools in your chat conversations.

- Build visual workflows by connecting LLM nodes (for AI reasoning) and Tool nodes (for MCP tool execution)
- Publish workflows to make them available as `@workflow_name` tools in chat
- Chain complex multi-step processes into reusable, automated sequences

<br/>

### 🎙️ Realtime Voice Assistant + MCP Tools

<p align="center">
  <video src="https://github.com/user-attachments/assets/e2657b8c-ce0b-40dd-80b6-755324024973" width="100%" />
</p>

This demo showcases a **realtime voice-based chatbot assistant** built with OpenAI's new Realtime API — now extended with full **MCP tool integration**.
Talk to the assistant naturally, and watch it execute tools in real time.

### ⚡️ Quick Tool Mentions (`@`) & Presets

<img width="1225" alt="image" src="https://github.com/user-attachments/assets/4d56dd25-a94c-4c19-9efa-fd7b5d3d2187" loading="lazy"/>


Quickly call tool during chat by typing `@toolname`.
No need to memorize — just type `@` and pick from the list!

**Tool Selection vs. Mentions (`@`) — When to Use What:**

* **Tool Selection**: Make frequently used tools always available to the LLM across all chats. Great for convenience and maintaining consistent context over time.
* **Mentions (`@`)**: Temporarily bind only the mentioned tools for that specific response. Since only the mentioned tools are sent to the LLM, this saves tokens and can improve speed and accuracy.

Each method has its own strengths — use them together to balance efficiency and performance.

You can also create **tool presets** by selecting only the MCP servers or tools you need.
Switch between presets instantly with a click — perfect for organizing tools by task or workflow.



### 🧭 Tool Choice Mode

<img width="1225" alt="image" src="https://github.com/user-attachments/assets/8fc64c6a-30c9-41a4-a5e5-4e8804f73473" loading="lazy"/>

Control how tools are used in each chat with **Tool Choice Mode** — switch anytime with `⌘P`.

- **Auto:** The model automatically calls tools when needed.
- **Manual:** The model will ask for your permission before calling a tool.
- **None:** Tool usage is disabled completely.

This lets you flexibly choose between autonomous, guided, or tool-free interaction depending on the situation.

### 🛠️ Default Tools

#### 🌐 Web Search

<img width="1034" height="940" alt="web-search" src="https://github.com/user-attachments/assets/261037d9-e1a7-44ad-b45e-43780390a94e" />

Built-in web search powered by [Tavily API](https://app.tavily.com/home). Search the web and extract content from URLs directly in your chats.

- **Optional:** Add `TAVILY_API_KEY` to `.env` to enable web search
- **Free Tier:** 1,000 requests/month at no cost
- **Easy Setup:** Get your API key with one click at [app.tavily.com](https://app.tavily.com/home)

#### ⚡️ JS Executor
<img width="1225" alt="js-executor-preview" src="https://github.com/user-attachments/assets/24d51665-c500-4c92-89de-7b46216e869f" loading="lazy"/>

It is a simple JS execution tool.

> Additionally, many basic tools are provided, such as visualization tools for drawing charts and tables, and an HTTP tool.

<br/>

…and there's even more waiting for you.
Try it out and see what else it can do!

<br/>

## Getting Started

> This project uses [pnpm](https://pnpm.io/) as the recommended package manager.

```bash
# If you don't have pnpm:
npm install -g pnpm
```

### Quick Start (Docker Compose Version) 🐳

```bash
# 1. Install dependencies
pnpm i

# 2. Enter only the LLM PROVIDER API key(s) you want to use in the .env file at the project root.
# Example: The app works with just OPENAI_API_KEY filled in.
# (The .env file is automatically created when you run pnpm i.)

# 3. Build and start all services (including PostgreSQL) with Docker Compose
pnpm docker-compose:up

```

### Quick Start (Local Version) 🚀

```bash
pnpm i

#(Optional) Start a local PostgreSQL instance
# If you already have your own PostgreSQL running, you can skip this step.
# In that case, make sure to update the PostgreSQL URL in your .env file.
pnpm docker:pg

# Enter required information in the .env file
# The .env file is created automatically. Just fill in the required values.
# For the fastest setup, provide at least one LLM provider's API key (e.g., OPENAI_API_KEY, CLAUDE_API_KEY, GEMINI_API_KEY, etc.) and the PostgreSQL URL you want to use.

pnpm build:local && pnpm start

# (Recommended for most cases. Ensures correct cookie settings.)
# For development mode with hot-reloading and debugging, you can use:
# pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to get started.

<br/>

### Environment Variables

The `pnpm i` command generates a `.env` file. Add your API keys there.

```dotenv
# === LLM Provider API Keys ===
# You only need to enter the keys for the providers you plan to use
GOOGLE_GENERATIVE_AI_API_KEY=****
OPENAI_API_KEY=****
XAI_API_KEY=****
ANTHROPIC_API_KEY=****
OPENROUTER_API_KEY=****
OLLAMA_BASE_URL=http://localhost:11434/api


# Secret for Better Auth (generate with: npx @better-auth/cli@latest secret)
BETTER_AUTH_SECRET=****

# (Optional)
# URL for Better Auth (the URL you access the app from)
BETTER_AUTH_URL=

# === Database ===
# If you don't have PostgreSQL running locally, start it with: pnpm docker:pg
POSTGRES_URL=postgres://your_username:your_password@localhost:5432/your_database_name

# (Optional)
# === Tools ===
# Tavily for web search and content extraction (optional, but recommended for @web and research features)
TAVILY_API_KEY=your_tavily_api_key_here


# Whether to use file-based MCP config (default: false)
FILE_BASED_MCP_CONFIG=false

# (Optional)
# === OAuth Settings ===
# Fill in these values only if you want to enable Google/GitHub login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Set this to 1 to disable user sign-ups.
DISABLE_SIGN_UP=

# Set this to 1 to disallow adding MCP servers.
NOT_ALLOW_ADD_MCP_SERVERS=
```

<br/>

## 📘 Guides

Step-by-step setup guides for running and configuring better-chatbot.

#### [🔌 MCP Server Setup & Tool Testing](./docs/tips-guides/mcp-server-setup-and-tool-testing.md)

- How to add and configure MCP servers in your environment

#### [🐳 Docker Hosting Guide](./docs/tips-guides/docker.md)

- How to self-host the chatbot using Docker, including environment configuration.

#### [▲ Vercel Hosting Guide](./docs/tips-guides/vercel.md)

- Deploy the chatbot to Vercel with simple setup steps for production use.

#### [🎯 System Prompts & Chat Customization](./docs/tips-guides/system-prompts-and-customization.md)

- Personalize your chatbot experience with custom system prompts, user preferences, and MCP tool instructions

#### [🔐 OAuth Sign-In Setup](./docs/tips-guides/oauth.md)

- Configure Google and GitHub OAuth for secure user login support.

#### [🕵🏿 Adding openAI like providers](docs/tips-guides/adding-openAI-like-providers.md)

- Adding openAI like ai providers
  <br/>

## 💡 Tips

Advanced use cases and extra capabilities that enhance your chatbot experience.

#### [🧠 Agentic Chatbot with Project Instructions](./docs/tips-guides/project_with_mcp.md)

- Use MCP servers and structured project instructions to build a custom assistant that helps with specific tasks.

#### [💬 Temporary Chat Windows](./docs/tips-guides/temporary_chat.md)

- Open lightweight popup chats for quick side questions or testing — separate from your main thread.

## 🗺️ Roadmap

Planned features coming soon to better-chatbot:

- [ ] **File Attach & Image Generation**
- [ ] **Collaborative Document Editing** (like OpenAI Canvas: user & assistant co-editing)
- [ ] **RAG (Retrieval-Augmented Generation)**
- [ ] **Web-based Compute** (with [WebContainers](https://webcontainers.io) integration)

💡 If you have suggestions or need specific features, please create an [issue](https://github.com/cgoinglove/better-chatbot/issues)!

## 🙌 Contributing

We welcome all contributions! Bug reports, feature ideas, code improvements — everything helps us build the best local AI assistant.

> **⚠️ Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting any Pull Requests or Issues.** This helps us work together more effectively and saves time for everyone.

**For detailed contribution guidelines**, please see our [Contributing Guide](./CONTRIBUTING.md).

**Language Translations:** Help us make the chatbot accessible to more users by adding new language translations. See [language.md](./messages/language.md) for instructions on how to contribute translations.

Let's build it together 🚀

## 💬 Join Our Discord

[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

Connect with the community, ask questions, and get support on our official Discord server!
