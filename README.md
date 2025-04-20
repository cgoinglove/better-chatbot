# MCP Client Chatbot: Local-First AI Assistant App

**English** | [한국어](./docs/ko.md) | [日本語](./docs/ja.md)

[![Local First](https://img.shields.io/badge/Local-First-blueviolet)](#)
[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)

**MCP Client Chatbot** is a versatile chat interface that supports various AI model providers like [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), [Google](https://ai.google.dev/), and [Ollama](https://ollama.com/). **It is designed for instant execution in 100% local environments without complex configuration**, enabling users to fully control computing resources on their personal computer or server.

> Built with [Vercel AI SDK](https://sdk.vercel.ai) and [Next.js](https://nextjs.org/), this app adopts modern patterns for building AI chat interfaces. Leverage the power of [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) to seamlessly integrate external tools into your chat experience.

> **Our goal:** Build an AI chatbot app that is optimized for personal use and easy for anyone to run.

## Table of Contents

- [MCP Client Chatbot: Local-First AI Assistant App](#mcp-client-chatbot-local-first-ai-assistant-app)
  - [Table of Contents](#table-of-contents)
  - [Demo](#demo)
  - [✨ Key Features](#-key-features)
  - [🚀 Getting Started](#-getting-started)
    - [Environment Variables](#environment-variables)
    - [MCP Server Setup](#mcp-server-setup)
  - [💡 Use Cases](#-use-cases)
  - [🗺️ Roadmap: Upcoming Features](#️-roadmap-upcoming-features)
  - [🙌 Contributing](#-contributing)

-----

## Demo

![mention](./docs/images/preview-2.gif)

**Quick Tool Access:** Use the `@` symbol in the message input to quickly select and call available MCP tools.

---

![playwright-demo](./docs/images/preview.gif)

**Tool Integration Example:** Demonstrates browser control using Microsoft's [playwright-mcp](https://github.com/microsoft/playwright-mcp).

*Prompt Example:* "Go to Reddit, open r/mcp, check the latest post and tell me what it's about — then close Reddit."

---

![tool-test](./docs/images/tool-test.gif)

**Standalone Tool Testing:** Test MCP tools independently of the chat flow for easier development and debugging.

---

![prompt-input](./docs/images/provider.gif)

**Model & Tool Selection UI:** Easily switch LLM providers and view tool status directly within the prompt input panel.

-----

## ✨ Key Features

* **💻 100% Local Execution:** Run directly on your PC or server without complex deployment, fully utilizing and controlling your computing resources.
* **🤖 Multiple AI Model Support:** Flexibly switch between providers like OpenAI, Anthropic, Google AI, and Ollama.
* **🛠️ Powerful MCP Integration:** Seamlessly connect external tools (browser automation, database operations, etc.) into chat via Model Context Protocol.
* **🚀 Standalone Tool Tester:** Test and debug MCP tools separately from the main chat interface.
* **💬 Intuitive Mentions:** Trigger available tools with `@` in the input field.
* **⚙️ Easy Server Setup:** Configure MCP connections via UI or `.mcp-config.json` file.
* **📄 Markdown UI:** Communicate in a clean, readable markdown-based interface.
* **💾 Zero-Setup Local DB:** Uses SQLite by default for local storage (PostgreSQL also supported).
* **🧩 Custom MCP Server Support:** Modify the built-in MCP server logic or create your own.

## 🚀 Getting Started

This project uses [pnpm](https://pnpm.io/) as the recommended package manager.

```bash
# 1. Install dependencies
pnpm i

# 2. Initialize project (creates .env, sets up DB)
pnpm initial

# 3. Start dev server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) after starting the server.

-----

### Environment Variables

The `pnpm initial` command generates a `.env` file. Add your API keys there:

```dotenv
GOOGLE_GENERATIVE_AI_API_KEY=****
OPENAI_API_KEY=****
# ANTHROPIC_API_KEY=****
```

SQLite is the default DB (`db.sqlite`). To use PostgreSQL, set `USE_FILE_SYSTEM_DB=false` and define `DATABASE_URL` in `.env`.

-----

### MCP Server Setup

You can connect MCP tools via:

1. **UI Setup:** Go to http://localhost:3000/mcp and configure through the interface.
2. **Direct File Edit:** Modify `.mcp-config.json` in project root.
3. **Custom Logic:** Edit `./custom-mcp-server/index.ts` to implement your own logic.

![mcp-config](./docs/images/mcp-config.gif)

-----

## 💡 Use Cases

* [Supabase Integration](./docs/use-cases/supabase.md): Use MCP to manage Supabase DB, auth, and real-time features.

-----

## 🗺️ Roadmap: Upcoming Features

We're making MCP Client Chatbot even more powerful with these planned features:

* **🎨 Canvas Mode:** Real-time editing interface for LLM + user collaboration (e.g. code, blogs).
* **🧩 LLM UI Generation:** Let LLMs render charts, tables, forms dynamically.
* **📜 Rule Engine:** Persistent system prompt/rules across the session.
* **🖼️ Image & File Uploads:** Multimodal interaction via uploads and image generation.
* **🐙 GitHub Mounting:** Mount local GitHub repos to ask questions and work on code.
* **📚 RAG Agent:** Retrieval-Augmented Generation using your own documents.
* **🧠 Planning Agent:** Smarter agent that plans and executes complex tasks.
* **🧑‍💻 Agent Builder:** Tool to create custom AI agents for specific goals.

👉 See full roadmap in [ROADMAP.md](./docs/ROADMAP.md)

-----

## 🙌 Contributing

We welcome all contributions! Bug reports, feature ideas, code improvements — everything helps us build the best local AI assistant.

Let’s build it together 🚀

