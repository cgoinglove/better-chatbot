# MCP Client Chatbot


[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)
[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cgoinglove/mcp-client-chatbot&env=BETTER_AUTH_SECRET&env=OPENAI_API_KEY&env=GOOGLE_GENERATIVE_AI_API_KEY&env=ANTHROPIC_API_KEY&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https://github.com/cgoinglove/mcp-client-chatbot/blob/main/.env.example&demo-title=MCP+Client+Chatbot&demo-description=An+Open-Source+MCP+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&products=[{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"}])

Our goal is to create the best possible chatbot UX — focusing on the joy and intuitiveness users feel when calling and interacting with AI tools.

See the experience in action in the [preview](#preview) below!

> Built with [Vercel AI SDK](https://sdk.vercel.ai) and [Next.js](https://nextjs.org/), this app adopts modern patterns for building AI chat interfaces. It leverages the power of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) to seamlessly integrate external tools into your chat experience.



## Table of Contents

- [MCP Client Chatbot](#mcp-client-chatbot)
  - [Table of Contents](#table-of-contents)
  - [Preview](#preview)
    - [🧩 Browser Automation with Playwright MCP](#-browser-automation-with-playwright-mcp)
    - [🎙️ Realtime Voice Assistant + MCP Tools](#️-realtime-voice-assistant--mcp-tools)
    - [⚡️ Quick Tool Mentions (`@`) \& Presets](#️-quick-tool-mentions---presets)
    - [🧭 Tool Choice Mode](#-tool-choice-mode)
    - [🔌 Easy MCP Server Integration \& 🛠️ Tool Testing](#-easy-mcp-server-integration--️-tool-testing)
  - [Getting Start](#getting-start)
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

## Preview

Get a feel for the UX — here’s a quick look at what’s possible.

### 🧩 Browser Automation with Playwright MCP

![playwright-preview](https://github.com/user-attachments/assets/53ec0069-aab4-47ff-b7c4-a8080a6a98ff)

**Example:** Control a web browser using Microsoft's [playwright-mcp](https://github.com/microsoft/playwright-mcp) tool.

- The LLM autonomously decides how to use tools from the MCP server, calling them multiple times to complete a multi-step task and return a final message.

Sample prompt:

```prompt
Please go to GitHub and visit the cgoinglove/mcp-client-chatbot project.
Then, click on the README.md file.
After that, close the browser.
Finally, tell me how to install the package.
```

---

### 🎙️ Realtime Voice Assistant + MCP Tools

[![Watch the demo](https://img.youtube.com/vi/e_8jAN9LNfc/hqdefault.jpg)](https://www.youtube.com/watch?v=e_8jAN9LNfc)


This demo showcases a **realtime voice-based chatbot assistant** built with OpenAI’s new Realtime API — now extended with full **MCP tool integration**.
Talk to the assistant naturally, and watch it execute tools in real time.


---

### ⚡️ Quick Tool Mentions (`@`) & Presets

![tool-mention](https://github.com/user-attachments/assets/bd47b175-320f-4c38-bc2f-be887c46178e)

Quickly call any registered MCP tool during chat by typing `@toolname`.
No need to memorize — just type `@` and select from the list!

You can also create **tool presets** by selecting only the MCP servers or tools you want.
Switch between presets instantly with a click — perfect for organizing tools by task or workflow.

---

### 🧭 Tool Choice Mode

![tool-mode](https://github.com/user-attachments/assets/043a37b6-c937-4b94-abb7-939124615368)

Control how tools are used in each chat with **Tool Choice Mode** — switch anytime with `⌘P`.

* **Auto:** The model automatically calls tools when needed.
* **Manual:** The model will ask for your permission before calling a tool.
* **None:** Tool usage is disabled completely.

This lets you flexibly choose between autonomous, guided, or tool-free interaction depending on the situation.

---

### 🔌 Easy MCP Server Integration & 🛠️ Tool Testing

![add-mcp-server](https://github.com/user-attachments/assets/f66ae118-883e-4638-b4fc-9f9849566da2)


Add new MCP servers effortlessly through the UI — no need to restart the app.
Each tool is available instantly and can be tested independently outside of chat.
Perfect for quick debugging and reliable development workflows.

---


The app also offers:

* Support for multiple languages
* **A wide range of themes** — not just light and dark, but many customizable styles to choose from
* **Temporary chats** — open a quick popup chat without disrupting your main conversation.
  These are not saved and can be toggled instantly with a shortcut, making them perfect for quick side questions or testing on the fly.

…and there’s even more waiting for you.
Try it out and see what else it can do!


<br/>



## Getting Start 

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
