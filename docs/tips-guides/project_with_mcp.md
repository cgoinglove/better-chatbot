# 🧠 Building a Project Agent with better-chatbot

You can turn the better-chatbot into a powerful agent by combining a **Project**, a custom **System Prompt**, and the **Tool Preset** feature. This is similar to how OpenAI and Claude structure their Project features — a way to start conversations with context tailored to a specific task or domain.

---

## 🛠️ How It Works

* A **Project** stores reusable instructions (system prompt) that are injected into every chat started within that project.
* A **Tool Preset** can be used independently to scope the available tools, but it is not directly bound to a project.

By using both together, you can create an effective workflow-specific assistant.

---

## 📦 Example: Managing the `better-chatbot` Repository

Let’s say you want to build an assistant for managing the `better-chatbot` GitHub repository:

1. **Create a Project** named `better-chatbot`
2. In the system prompt, include:

   * A description of the project
   * Technologies used
   * That the assistant should behave like a contributor
   * A brief instruction on how to use the GitHub MCP server
3. Separately, create a **Tool Preset** including 10–15 GitHub tools like `list_issues`, `comment_on_issue`, `merge_pr`, etc.

Now, any chat created under the `better-chatbot` project will always start with that system prompt. If the user enables the corresponding Tool Preset, the assistant becomes a specialized project agent.

---

## 💬 Example Interaction

**User:** Check recent issues
**Agent:** (retrieves and summarizes latest issues in the GitHub repository)

**User:** Write a comment explaining the benefit
**Agent:** (generates and posts a comment via GitHub MCP tool)

---

This setup lets you:

* Reuse task-specific context across chats
* Focus tools and behavior for a given project
* Reduce repetitive setup and instructions

> 💡 Great for workflows like translation, repo management, documentation review, or anything with clear structure and goals.
