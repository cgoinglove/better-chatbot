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
  - [💡 Tips](#-tips)
      - [🧠 Agentic Chatbot with Project Instructions](#-agentic-chatbot-with-project-instructions)
      - [💬 Temporary Chat Windows](#-temporary-chat-windows)
  - [🗺️ Roadmap](#️-roadmap)
  - [🙌 Contributing](#-contributing)
  - [💬 Join Our Discord](#-join-our-discord)

---

## Preview

Get a feel for the UX — here's a quick look at what's possible.

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

<br/>

### 🎙️ Realtime Voice Assistant + MCP Tools


<p align="center">
  <video src="https://github.com/user-attachments/assets/e2657b8c-ce0b-40dd-80b6-755324024973" width="100%" />
</p>




This demo showcases a **realtime voice-based chatbot assistant** built with OpenAI's new Realtime API — now extended with full **MCP tool integration**.
Talk to the assistant naturally, and watch it execute tools in real time.

### ⚡️ Quick Tool Mentions (`@`) & Presets

![tool-mention](https://github.com/user-attachments/assets/bd47b175-320f-4c38-bc2f-be887c46178e)

Quickly call any registered MCP tool during chat by typing `@toolname`.
No need to memorize — just type `@` and select from the list!

You can also create **tool presets** by selecting only the MCP servers or tools you want.
Switch between presets instantly with a click — perfect for organizing tools by task or workflow.

### 🧭 Tool Choice Mode

<img width="1161" alt="tool-mode" src="https://github.com/user-attachments/assets/0988f8dd-8a37-4adf-84da-79c083917af9" />


Control how tools are used in each chat with **Tool Choice Mode** — switch anytime with `⌘P`.

- **Auto:** The model automatically calls tools when needed.
- **Manual:** The model will ask for your permission before calling a tool.
- **None:** Tool usage is disabled completely.

This lets you flexibly choose between autonomous, guided, or tool-free interaction depending on the situation.

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

# Whether to use file-based MCP config (default: false)
FILE_BASED_MCP_CONFIG=false

# (Optional)
# === OAuth Settings ===
# Fill in these values only if you want to enable Google/GitHub login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

<br/>

## 📘 Guides

Step-by-step setup guides for running and configuring MCP Client Chatbot.


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

#### [Adding openAI like providers](docs/tips-guides/adding-openAI-like-providers.md)
- Adding openAI like ai providers
<br/>

## 💡 Tips

Advanced use cases and extra capabilities that enhance your chatbot experience.

#### [🧠 Agentic Chatbot with Project Instructions](./docs/tips-guides/project_with_mcp.md)

- Use MCP servers and structured project instructions to build a custom assistant that helps with specific tasks.

#### [💬 Temporary Chat Windows](./docs/tips-guides/temporary_chat.md)

- Open lightweight popup chats for quick side questions or testing — separate from your main thread.

## 🗺️ Roadmap

Planned features coming soon to MCP Client Chatbot:

- [ ] **MCP-integrated LLM Workflow**
- [ ] **File Attach & Image Generation**
- [ ] **Collaborative Document Editing** (like OpenAI Canvas: user & assistant co-editing)
- [ ] **RAG (Retrieval-Augmented Generation)**
- [ ] **Web-based Compute** (with [WebContainers](https://webcontainers.io) integration)

💡 If you have suggestions or need specific features, please create an [issue](https://github.com/cgoinglove/mcp-client-chatbot/issues)!

## 🙌 Contributing

We welcome all contributions! Bug reports, feature ideas, code improvements — everything helps us build the best local AI assistant.

**For detailed contribution guidelines**, please see our [Contributing Guide](./CONTRIBUTING.md).

**Language Translations:** Help us make the chatbot accessible to more users by adding new language translations. See [language.md](./messages/language.md) for instructions on how to contribute translations.

Let's build it together 🚀

## 💬 Join Our Discord

[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

Connect with the community, ask questions, and get support on our official Discord server!
