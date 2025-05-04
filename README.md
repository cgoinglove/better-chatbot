# MCP Client Chatbot

**English** | [한국어](./docs/ko.md)

[![Local First](https://img.shields.io/badge/Local-First-blueviolet)](#)
[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)

**MCP Client Chatbot** is a versatile chat interface that supports various AI model providers like [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), [Google](https://ai.google.dev/), and [Ollama](https://ollama.com/). **It is designed for instant execution in 100% local environments without complex configuration**, enabling users to fully control computing resources on their personal computer or server.

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
  - [✨ Key Features](#-key-features)
  - [🚀 Getting Started](#-getting-started)
    - [Environment Variables](#environment-variables)
    - [Custom OpenAI-Compatible Providers](#custom-openai-compatible-providers)
    - [MCP Server Setup](#mcp-server-setup)
  - [💡 Use Cases](#-use-cases)
  - [🗺️ Roadmap: Upcoming Features](#️-roadmap-upcoming-features)
  - [🙌 Contributing](#-contributing)

---

## Demo

Here are some quick examples of how you can use MCP Client Chatbot:

---

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


MCP tools independently from chat sessions for easier development and debugging.

---


## ✨ Key Features

* **💻 100% Local Execution:** Run directly on your PC or server without complex deployment, fully utilizing and controlling your computing resources.
* **🤖 Multiple AI Model Support:** Flexibly switch between providers like OpenAI, Anthropic, Google AI, and Ollama.
* **🛠️ Powerful MCP Integration:** Seamlessly connect external tools (browser automation, database operations, etc.) into chat via Model Context Protocol.
* **🚀 Standalone Tool Tester:** Test and debug MCP tools separately from the main chat interface.
* **💬 Intuitive Mentions + Tool Control:** Trigger tools with `@`, and control when they're used via `Auto` / `Manual` / `None` modes.
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

Open [http://localhost:3000](http://localhost:3000) in your browser to get started.

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

### Custom OpenAI-Compatible Providers

MCP Client Chatbot supports connecting to any OpenAI-compatible API provider, including:

- [OpenRouter](https://openrouter.ai)
- [LocalAI](https://localai.io)
- [Groq](https://groq.com)
- Any other provider with an OpenAI-compatible API endpoint

#### OpenRouter Configuration

1. Get an API key from [OpenRouter](https://openrouter.ai)
2. Add to your `.env` file:
   ```
   OPENROUTER_API_KEY=your_api_key_here
   SITE_URL=https://example.com   # Optional: Your site URL for attribution
   SITE_NAME=MCP Client Chatbot   # Optional: Your app name for attribution
   
   # Define which models to use (format: display_name:model_id)
   CUSTOM_PROVIDER_MODELS_openrouter=claude:anthropic/claude-3-opus,llama-3:meta/llama-3-70b
   ```

#### Other Custom Providers

Configure any OpenAI-compatible provider:

```dotenv
# Format: provider_name:base_url:api_key_env_var,...
CUSTOM_PROVIDERS=localai:http://localhost:8080/v1:LOCALAI_API_KEY,groq:https://api.groq.com/v1:GROQ_API_KEY

# API keys for each provider
LOCALAI_API_KEY=your_localai_key
GROQ_API_KEY=your_groq_key

# Models for each provider (format: display_name:model_id)
CUSTOM_PROVIDER_MODELS_localai=llama3:llama-3-70b-chat,wizard:wizard-13b
CUSTOM_PROVIDER_MODELS_groq=llama3-70b:llama3-70b-v2,mixtral:mixtral-8x7b-32768
```

Remember to restart the app after updating environment variables.

-----

### MCP Server Setup

You can connect MCP tools via:

1. **UI Setup:** Go to http://localhost:3000/mcp and configure through the interface.
2. **Direct File Edit:** Modify `.mcp-config.json` in project root.
3. **Custom Logic:** Edit `./custom-mcp-server/index.ts` to implement your own logic.

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

Let's build it together 🚀

<img src="https://contrib.rocks/image?repo=cgoinglove/mcp-client-chatbot" />
