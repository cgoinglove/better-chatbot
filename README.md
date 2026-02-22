> [!WARNING] 
> The author of this project has paused development until February, however, I (@brrock) will try and address vulnerabilities and issues. If you are contributing, you might have to wait until development continues.
<img width="1184" height="576" alt="thumbnail" loading="lazy" src="https://github.com/user-attachments/assets/d6ba80ff-a62a-4920-b266-85c4a89d6076" />

[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)
[![Local First](https://img.shields.io/badge/Local-First-blue)](https://localfirstweb.dev/)
[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

[![Deploy with Vercel](https://vercel.com/button)](<https://vercel.com/new/clone?repository-url=https://github.com/cgoinglove/better-chatbot&env=BETTER_AUTH_SECRET&env=OPENAI_API_KEY&env=GOOGLE_GENERATIVE_AI_API_KEY&env=ANTHROPIC_API_KEY&envDescription=BETTER_AUTH_SECRET+is+required+(enter+any+secret+value).+At+least+one+LLM+provider+API+key+(OpenAI,+Claude,+or+Google)+is+required,+but+you+can+add+all+of+them.+See+the+link+below+for+details.&envLink=https://github.com/cgoinglove/better-chatbot/blob/main/.env.example&demo-title=better-chatbot&demo-description=An+Open-Source+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&products=[{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"},{"type":"integration","protocol":"storage","productSlug":"upstash-kv","integrationSlug":"upstash"},{"type":"blob"}]>)

🚀 **[Live Demo](https://better-chatbot-demo.vercel.app/)** | See the experience in action in the [preview](#preview) below!

#### Demo Chats

- **MCP Tools Demo:** [Chat with Tools](https://better-chatbot-demo.vercel.app/export/a4820921-8012-496b-8a5d-13757050bafe)
- **Image Generation Demo:** [Chat with Image Generation](https://better-chatbot-demo.vercel.app/export/452ad745-9efb-49ae-9114-10db15f1b827)

## Quick Start 🚀

> **Get your app running in minutes! No installation or payment required.**

You only need **one AI Provider API Key** (OpenAI, Claude, Gemini, etc.). Everything else runs on free tiers - database, file storage, and hosting.

👉 **[Click this guide to deploy your site with just a few clicks](docs/tips-guides/vercel.md)**

---

**Better Chatbot** - A better open-source AI chatbot for individuals and teams, inspired by ChatGPT, Claude, Grok, and Gemini.

• **Multi-AI Support** - Integrates all major LLMs: OpenAI, Anthropic, Google, xAI, Ollama, and more  
• **Powerful Tools** - MCP protocol, web search, JS/Python code execution, data visualization  
• **Image Generation** - Create and edit images with AI models (OpenAI, Google Gemini, xAI)  
• **Automation** - Custom agents, visual workflows, artifact generation  
• **Collaboration** - Share agents, workflows, and MCP configurations with your team  
• **Voice Assistant** - Realtime voice chat with full MCP tool integration  
• **Intuitive UX** - Instantly invoke any feature with `@mention`  
• **Quick Start** - Deploy free with Vercel Deploy button

Built with Vercel AI SDK and Next.js, combining the best features of leading AI services into one platform.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Preview](#preview)
  - [🧩 Browser Automation with Playwright MCP](#-browser-automation-with-playwright-mcp)
  - [🔗 Visual Workflows as Custom Tools](#-visual-workflows-as-custom-tools)
  - [🤖 Custom Agents](#-custom-agents)
  - [🎙️ Realtime Voice Assistant + MCP Tools](#️-realtime-voice-assistant--mcp-tools)
  - [⚡️ Quick Tool Mentions (`@`) \& Presets](#️-quick-tool-mentions---presets)
  - [🧭 Tool Choice Mode](#-tool-choice-mode)
  - [🛠️ Default Tools](#️-default-tools)
    - [🌐 Web Search](#-web-search)
    - [⚡️ JS,PYTHON Executor](#️-jspython-executor)
    - [📊 Data Visualization Tools](#-data-visualization-tools)
- [Getting Started](#getting-started)
  - [Quick Start (Docker Compose Version) 🐳](#quick-start-docker-compose-version-)
  - [Quick Start (Local Version) 🚀](#quick-start-local-version-)
  - [Environment Variables](#environment-variables)
- [📘 Guides](#-guides)
  - [🔌 MCP Server Setup \& Tool Testing](#-mcp-server-setup--tool-testing)
  - [🐳 Docker Hosting Guide](#-docker-hosting-guide)
  - [▲ Vercel Hosting Guide](#-vercel-hosting-guide)
  - [🗂️ File Storage Drivers](#️-file-storage-drivers)
  - [🎯 System Prompts \& Chat Customization](#-system-prompts--chat-customization)
  - [🔐 OAuth Sign-In Setup](#-oauth-sign-in-setup)
  - [🕵🏿 Adding openAI like providers](#-adding-openai-like-providers)
  - [🧪 E2E Testing Guide](#-e2e-testing-guide)
- [💡 Tips](#-tips)
  - [💬 Temporary Chat Windows](#-temporary-chat-windows)
- [🗺️ Roadmap](#️-roadmap)
- [🙌 Contributing](#-contributing)
- [💬 Join Our Discord](#-join-our-discord)

> This project is evolving at lightning speed! ⚡️ We're constantly shipping new features and smashing bugs. **Star this repo** to join the ride and stay in the loop with the latest updates!

## Preview

Get a feel for the UX — here's a quick look at what's possible.

### 🧩 Browser Automation with Playwright MCP

![preview](https://github.com/user-attachments/assets/e4febb04-26d5-45da-a7bb-f7d452d333c2)

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

<img width="1912" height="953" alt="workflow" loading="lazy" src="https://github.com/user-attachments/assets/e69e72e8-595c-480e-b519-4531f4c6331f" />

<img width="1567" alt="workflow-mention" loading="lazy" src="https://github.com/user-attachments/assets/cf3e1339-ee44-4615-a71d-f6b46833e41f" />

**Example:** Create custom workflows that become callable tools in your chat conversations.

- Build visual workflows by connecting LLM nodes (for AI reasoning) and Tool nodes (for MCP tool execution)
- Publish workflows to make them available as `@workflow_name` tools in chat
- Chain complex multi-step processes into reusable, automated sequences

<br/>

### 🤖 Custom Agents

<img width="1567" alt="agent-example" loading="lazy" src="https://github.com/user-attachments/assets/d0a325c0-ff1e-4038-b6bf-fcf57659a5c1" />

**Example:** Create specialized AI agents with custom instructions and tool access.

- Define custom agents with specific system prompts and available tools
- Easily invoke agents in chat using `@agent_name`
- Build task-specific assistants like a GitHub Manager agent with issue/PR tools and project context

For instance, create a GitHub Manager agent by:

- Providing GitHub tools (issue/PR creation, comments, queries)
- Adding project details to the system prompt
- Calling it with `@github_manager` to manage your repository

<br/>

### 🎙️ Realtime Voice Assistant + MCP Tools

<p align="center">
  <video src="https://github.com/user-attachments/assets/e2657b8c-ce0b-40dd-80b6-755324024973" width="100%" />
</p>

This demo showcases a **realtime voice-based chatbot assistant** built with OpenAI's new Realtime API — now extended with full **MCP tool integration**.
Talk to the assistant naturally, and watch it execute tools in real time.

### ⚡️ Quick Tool Mentions (`@`) & Presets

<img width="1225" alt="image" src="https://github.com/user-attachments/assets/dfe76b3b-c3d8-436e-8a7c-7b23292e234c" loading="lazy"/>

Quickly call tool during chat by typing `@toolname`.
No need to memorize — just type `@` and pick from the list!

**Tool Selection vs. Mentions (`@`) — When to Use What:**

- **Tool Selection**: Make frequently used tools always available to the LLM across all chats. Great for convenience and maintaining consistent context over time.
- **Mentions (`@`)**: Temporarily bind only the mentioned tools for that specific response. Since only the mentioned tools are sent to the LLM, this saves tokens and can improve speed and accuracy.

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

Built-in web search powered by [Exa AI](https://exa.ai). Search the web with semantic AI and extract content from URLs directly in your chats.

- **Optional:** Add `EXA_API_KEY` to `.env` to enable web search
- **Free Tier:** 1,000 requests/month at no cost, no credit card required
- **Easy Setup:** Get your API key instantly at [dashboard.exa.ai](https://dashboard.exa.ai)

#### 🎨 Image Generation

<img width="1034" height="940" loading="lazy" alt="image-generation" src="https://github.com/user-attachments/assets/b081c837-8948-4f4d-a2f4-c8630cf0eaa2" />

Built-in image generation and editing capabilities powered by AI models. Create, edit, and modify images directly in your chats.

- **Supported Operations:** Image generation, editing, and composition
- **Current Models:** Gemini Nano Banana, OpenAI

#### ⚡️ JS,PYTHON Executor

<img width="1225" alt="js-executor-preview" src="https://github.com/user-attachments/assets/7deed824-e70b-46d4-a294-de20ed4dc869" loading="lazy"/>

It is a simple JS execution tool.

#### 📊 Data Visualization Tools

**Interactive Tables**: Create feature-rich data tables with advanced functionality:

- **Sorting & Filtering**: Sort by any column, filter data in real-time
- **Search & Highlighting**: Global search with automatic text highlighting
- **Export Options**: Export to CSV or Excel format with lazy-loaded libraries
- **Column Management**: Show/hide columns with visibility controls
- **Pagination**: Handle large datasets with built-in pagination
- **Data Type Support**: Proper formatting for strings, numbers, dates, and booleans

**Chart Generation**: Visualize data with various chart types (bar, line, pie charts)

> Additionally, many other tools are provided, such as an HTTP client for API requests and more.

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

Alternative: Use Docker Compose for DB only (run app via pnpm)

```bash
# Start Postgres only via compose
# Ensure your .env includes: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB matching POSTGRES_URL
docker compose -f docker/compose.yml up -d postgres

# Apply migrations
pnpm db:migrate


# Run app locally
pnpm dev   # or: pnpm build && pnpm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser to get started.

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
# Exa AI for web search and content extraction (optional, but recommended for @web and research features)
EXA_API_KEY=your_exa_api_key_here


# Whether to use file-based MCP config (default: false)
FILE_BASED_MCP_CONFIG=false

# === File Storage ===
# Vercel Blob is the default storage driver (works in both local dev and production)
# Pull the token locally with `vercel env pull`
FILE_STORAGE_TYPE=vercel-blob
FILE_STORAGE_PREFIX=uploads
BLOB_READ_WRITE_TOKEN=

# -- S3 (coming soon) --
# FILE_STORAGE_TYPE=s3
# FILE_STORAGE_PREFIX=uploads
# FILE_STORAGE_S3_BUCKET=
# FILE_STORAGE_S3_REGION=

# (Optional)
# === OAuth Settings ===
# Fill in these values only if you want to enable Google/GitHub/Microsoft login

#GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

#Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Set to 1 to force account selection
GOOGLE_FORCE_ACCOUNT_SELECTION=


# Microsoft
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
# Optional Tenant Id
MICROSOFT_TENANT_ID=
# Set to 1 to force account selection
MICROSOFT_FORCE_ACCOUNT_SELECTION=

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

#### [🗂️ File Storage Drivers](./docs/tips-guides/file-storage.md)

- Cloud-based file storage with Vercel Blob (default) for seamless uploads in both development and production. S3 support coming soon.

#### [🎯 System Prompts & Chat Customization](./docs/tips-guides/system-prompts-and-customization.md)

- Personalize your chatbot experience with custom system prompts, user preferences, and MCP tool instructions

#### [🔐 OAuth Sign-In Setup](./docs/tips-guides/oauth.md)

- Configure Google, GitHub, and Microsoft OAuth for secure user login support.

#### [🕵🏿 Adding openAI like providers](docs/tips-guides/adding-openAI-like-providers.md)

- Adding openAI like ai providers

#### [🧪 E2E Testing Guide](./docs/tips-guides/e2e-testing-guide.md)

- Comprehensive end-to-end testing with Playwright including multi-user scenarios, agent visibility testing, and CI/CD integration
  <br/>

## 💡 Tips

#### [💬 Temporary Chat Windows](./docs/tips-guides/temporary_chat.md)

- Open lightweight popup chats for quick side questions or testing — separate from your main thread.

## 🗺️ Roadmap

Planned features coming soon to better-chatbot:

- [x] **File Upload & Storage** (Vercel Blob integration)
- [x] **Image Generation**
- [ ] **Collaborative Document Editing** (like OpenAI Canvas: user & assistant co-editing)
- [ ] **RAG (Retrieval-Augmented Generation)**
- [ ] **Web-based Compute** (with [WebContainers](https://webcontainers.io) integration)

💡 If you have suggestions or need specific features, please create an [issue](https://github.com/cgoinglove/better-chatbot/issues)!

## 💖 Support

If this project has been helpful to you, please consider supporting its development:

- ⭐ **Star** this repository
- 🐛 **Report** bugs and suggest features
- 💰 **[Become a sponsor](https://github.com/sponsors/cgoinglove)** to support ongoing development

Your support helps maintain and improve this project. Thank you! 🙏

## 🙌 Contributing

We welcome all contributions! Bug reports, feature ideas, code improvements — everything helps us build the best local AI assistant.

> **⚠️ Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting any Pull Requests or Issues.** This helps us work together more effectively and saves time for everyone.

**For detailed contribution guidelines**, please see our [Contributing Guide](./CONTRIBUTING.md).

**Language Translations:** Help us make the chatbot accessible to more users by adding new language translations. See [language.md](./messages/language.md) for instructions on how to contribute translations.

Let's build it together 🚀

## 💬 Join Our Discord

[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

Connect with the community, ask questions, and get support on our official Discord server!
