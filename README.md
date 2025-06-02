# MCP Client Chatbot

[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)
[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cgoinglove/mcp-client-chatbot&env=BETTER_AUTH_SECRET&env=OPENAI_API_KEY&env=GOOGLE_GENERATIVE_AI_API_KEY&env=ANTHROPIC_API_KEY&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https://github.com/cgoinglove/mcp-client-chatbot/blob/main/.env.example&demo-title=MCP+Client+Chatbot&demo-description=An+Open-Source+MCP+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&products=[{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"}])

**MCP Client Chatbot** is a versatile chat interface that supports various AI model providers like [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), [Gemini](https://gemini.google.com/), and [Ollama](https://ollama.com/). 

It is also the first known speech-based chatbot with integrated MCP Server support, enabling real-time multimodal interactions.

Our mission is to build the **most powerful tool-using chatbot**, combining the best of language models and tool orchestration.  

We aim to create diverse UX and features that allow LLMs to actively use tools — such as `@tool` mentions for direct invocation,  
enabling **speech-based chat to access and use MCP server tools**, quick tool presets for fast selection,  
and the upcoming **workflow with tools** feature for multi-step automation.


> Built with [Vercel AI SDK](https://sdk.vercel.ai) and [Next.js](https://nextjs.org/), this app adopts modern patterns for building AI chat interfaces. Leverage the power of [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) to seamlessly integrate external tools into your chat experience.


**🌟 Open Source Project**
MCP Client Chatbot is a 100% community-driven open source project.

## Table of Contents

- [MCP Client Chatbot](#mcp-client-chatbot)
  - [Table of Contents](#table-of-contents)
  - [Demo](#demo)
    - [🧩 Browser Automation with Playwright MCP](#-browser-automation-with-playwright-mcp)
    - [⚡️ Quick Tool Mentions (`@`)](#️-quick-tool-mentions-)
    - [🔌 Adding MCP Servers Easily](#-adding-mcp-servers-easily)
    - [🛠️ Standalone Tool Testing](#️-standalone-tool-testing)
    - [📊 Built-in Chart Tools](#-built-in-chart-tools)
  - [✨ Key Features](#-key-features)
    - [Quick Start (Local Version) 🚀](#quick-start-local-version-)
    - [Quick Start (Docker Compose Version) 🐳](#quick-start-docker-compose-version-)
    - [Environment Variables](#environment-variables)
    - [MCP Server Setup](#mcp-server-setup)
  - [💡 Tips \& Guides](#-tips--guides)
    - [Docker Hosting Guide:](#docker-hosting-guide)
    - [Vercel Hosting Guide:](#vercel-hosting-guide)
    - [OAuth Setup Guide (Google \& GitHub):](#oauth-setup-guide-google--github)
    - [Project Feature with MCP Server:](#project-feature-with-mcp-server)
  - [🗺️ Roadmap: Next Features](#️-roadmap-next-features)
    - [🚀 Deployment \& Hosting ✅](#-deployment--hosting-)
    - [📎 File \& Image](#-file--image)
    - [🔄 MCP Workflow](#-mcp-workflow)
    - [🛠️ Built-in Tools \& UX](#️-built-in-tools--ux)
    - [💻 LLM Code Write (with Daytona)](#-llm-code-write-with-daytona)
  - [🙌 Contributing](#-contributing)
  - [💬 Join Our Discord](#-join-our-discord)

---

## Demo

Here are some quick examples of how you can use MCP Client Chatbot:


### 🧩 Browser Automation with Playwright MCP

![playwright-demo](./docs/images/preview-1.gif)

**Example:** Control a web browser using Microsoft's [playwright-mcp](https://github.com/microsoft/playwright-mcp) tool.

Sample prompt:

```prompt
Please go to GitHub and visit the cgoinglove profile.
Open the mcp-client-chatbot project.
Then, click on the README.md file.
After that, close the browser.
Finally, tell me how to install the package.
```

---

### ⚡️ Quick Tool Mentions (`@`)

![mention](https://github.com/user-attachments/assets/1a80dd48-1d95-4938-b0d8-431c02ec2a53)

Quickly call any registered MCP tool during chat by typing `@toolname`.  
No need to memorize — just type `@` and pick from the list!

You can also control how tools are used with the new **Tool Choice Mode**:

- **Auto:** Tools are automatically called by the model when needed.
- **Manual:** The model will ask for your permission before calling any tool.
- **None:** Disables all tool usage.

Toggle modes anytime with the shortcut `⌘P`.

---

### 🔌 Adding MCP Servers Easily

![mcp-server-install](https://github.com/user-attachments/assets/c71fd58d-b16e-4517-85b3-160685a88e38)

Add new MCP servers easily through the UI, and start using new tools without restarting the app.

---

### 🛠️ Standalone Tool Testing

![tool-test](https://github.com/user-attachments/assets/980dd645-333f-4e5c-8ac9-3dc59db19e14)

Test MCP tools independently of chat sessions to simplify development and debugging.

### 📊 Built-in Chart Tools

![May-04-2025 01-55-04](https://github.com/user-attachments/assets/7bf9d895-9023-44b1-b7f2-426ae4d7d643)

Visualize chatbot responses as pie, bar, or line charts using the built-in tool — perfect for quick data insight during conversations.

---

## ✨ Key Features

- **💻 100% Local Execution:** Run directly on your PC or server without complex deployment, fully utilizing and controlling your computing resources.
- **🤖 Multiple AI Model Support:** Flexibly switch between providers like OpenAI, Anthropic, Google AI, and Ollama.
- **🗣️ Real-time voice chat powered by MCP Server:** Currently supports **OpenAI** provider (Gemini support coming soon)
- **🛠️ Powerful MCP Integration:** Seamlessly connect external tools (browser automation, database operations, etc.) into chat via Model Context Protocol.
- **🚀 Standalone Tool Tester:** Test and debug MCP tools separately from the main chat interface.
- **💬 Intuitive Mentions + Tool Control:** Trigger tools with `@`, and control when they're used via `Auto` / `Manual` / `None` modes.
- **⚙️ Easy Server Setup:** Configure MCP connections via UI or `.mcp-config.json` file.
- **📄 Markdown UI:** Communicate in a clean, readable markdown-based interface.
- **🧩 Custom MCP Server Support:** Modify the built-in MCP server logic or create your own.
- **📊 Built-in Chart Tools:** Generate pie, bar, and line charts directly in chat with natural prompts.
- **🛫Easy Deployment:** with vercel support baked in it makes an easily accesible chatbot.
- **🏃Run anywhere:** Easily launch with Docker Compose—just build the image and run.
- **🏴i8n suppport:** We have Korean and English languages making the chatbot accessible to all.

> This project uses [pnpm](https://pnpm.io/) as the recommended package manager.

```bash
# If you don't have pnpm:
npm install -g pnpm
```

### Quick Start (Local Version) 🚀

```bash
# 1. Install dependencies
pnpm i

# 2. Create the environment variable file and fill in your .env values
pnpm initial:env # This runs automatically in postinstall, so you can usually skip it.

# 3. (Optional) If you already have PostgreSQL running and .env is configured, skip this step
pnpm docker:pg

# 4. Run database migrations
pnpm db:migrate

# 5. Start the development server
pnpm dev

# 6. (Optional) Build & start for local production-like testing
pnpm build:local && pnpm start
# Use build:local for local start to ensure correct cookie settings
```


### Quick Start (Docker Compose Version) 🐳

```bash
# 1. Install dependencies
pnpm i

# 2. Create environment variable files and fill in the required values
pnpm initial:env # This runs automatically in postinstall, so you can usually skip it.

# 3. Build and start all services (including PostgreSQL) with Docker Compose
pnpm docker-compose:up

```

Open [http://localhost:3000](http://localhost:3000) in your browser to get started.

---

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

# URL for Better Auth (the URL you access the app from)
BETTER_AUTH_URL=
# === Database ===
# If you don't have PostgreSQL running locally, start it with: pnpm docker:pg
POSTGRES_URL=postgres://your_username:your_password@localhost:5432/your_database_name

# Whether to use file-based MCP config (default: false)
FILE_BASED_MCP_CONFIG=false

# === OAuth Settings (Optional) ===
# Fill in these values only if you want to enable Google/GitHub login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```
---

### MCP Server Setup

You can connect MCP tools via:

1. **UI Setup:** Go to http://localhost:3000/mcp and configure through the interface.
2. **Custom Logic:** Edit `./custom-mcp-server/index.ts` to implement your own logic, this also doesn't run on vercel or docker.
3. **File based for local dev:** make .mcp-config.json and put your servers in there. Only works in local dev, no docker or vercel env variable required. For example 
```jsonc
// .mcp-config.json
{
  "playwright":  {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
}
```


## 💡 Tips & Guides

Here are some practical tips and guides for using MCP Client Chatbot:

### [Docker Hosting Guide](./docs/tips-guides/docker.md):
Learn how to set up docker.

### [Vercel Hosting Guide](./docs/tips-guides/vercel.md):
Learn how to set up vercel.

### [OAuth Setup Guide (Google & GitHub)](./docs/tips-guides/oauth.md):
Learn how to configure Google and GitHub OAuth for login functionality.

### [Project Feature with MCP Server](./docs/tips-guides/project_with_mcp.md): 
Learn how to integrate system instructions and structures with MCP servers to build an agent that assists with GitHub-based project management.




## 🗺️ Roadmap: Next Features

MCP Client Chatbot is evolving with these upcoming features:

### 🚀 Deployment & Hosting ✅

- **Self Hosting:** ✅
  - Easy deployment with Docker Compose ✅
  - Vercel deployment support (MCP Server: SSE only)✅

### 📎 File & Image

- **File Attach & Image Generation:**
  - File upload and image generation
  - Multimodal conversation support

### 🔄 MCP Workflow

- **MCP Flow:**
  - Workflow automation with MCP Server integration

### 🛠️ Built-in Tools & UX

- **Default Tools for Chatbot:**
  - Collaborative document editing (like OpenAI Canvas: user & assistant co-editing)
  - RAG (Retrieval-Augmented Generation)
  - Useful built-in tools for chatbot UX (usable without MCP)

### 💻 LLM Code Write (with Daytona)

- **LLM-powered code writing and editing using Daytona integration**
  - Seamless LLM-powered code writing, editing, and execution in a cloud development environment via Daytona integration. Instantly generate, modify, and run code with AI assistance—no local setup required.

💡 If you have suggestions or need specific features, please create an [issue](https://github.com/cgoinglove/mcp-client-chatbot/issues)!



## 🙌 Contributing

We welcome all contributions! Bug reports, feature ideas, code improvements — everything helps us build the best local AI assistant.

**For detailed contribution guidelines**, please see our [Contributing Guide](./CONTRIBUTING.md).

**Language Translations:** Help us make the chatbot accessible to more users by adding new language translations. See [language.md](./messages/language.md) for instructions on how to contribute translations.

Let's build it together 🚀

## 💬 Join Our Discord

[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

Connect with the community, ask questions, and get support on our official Discord server!
