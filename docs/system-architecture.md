# System Architecture

This document explains the architecture of the chat application, detailing the frontend, backend, Large Language Model (LLM), and Master Control Program (MCP) interactions. It covers the main components, their roles, and how they collaborate to deliver a conversational AI experience.

## Outline the System Architecture

The system is comprised of three main components:

1.  **Frontend:** This is the user interface of the application. Its primary role is to provide a way for users to interact with the system, input data, and view results.
2.  **Backend:** The backend serves as the central processing unit of the application. It handles requests from the Frontend, orchestrates communication between different components, and processes business logic.
3.  **Large Language Model (LLM):** The LLM is responsible for processing natural language, understanding user intent, and generating human-like responses or performing tasks based on the input received.

These components interact in the following manner:

*   The user interacts with the **Frontend**.
*   The **Frontend** sends user requests to the **Backend**.
*   The **Backend** communicates with the **Large Language Model (LLM)** and the **MCP Manager** (for tool integration).
*   The **LLM** processes the information and returns its output (text or tool calls) to the **Backend**.
*   The **Backend** sends the final response back to the **Frontend**, which then displays it to the user.

## Deep Dive into the Frontend

The frontend is built using React and Next.js, providing a dynamic and responsive user experience for interacting with the chat application.

### Key React Components

The chat interface is constructed using several key React components:

*   **`ChatBot.tsx`**: This is the main component that orchestrates the chat interface. It manages the overall chat state, including messages, input, and communication with the backend. It renders the message list and the input area.
*   **`PromptInput.tsx`**: This component is responsible for capturing user input. It provides a text area for users to type their messages and a button to send them. It also handles potential loading states and the ability to stop message generation.
*   **`PreviewMessage.tsx`**: This component is responsible for rendering individual messages within the chat log. It handles different message types (user, assistant, tool calls, errors) and formats them appropriately for display. It also manages interactions related to specific messages, like re-running a message or handling tool call responses.

### User Input and Backend Communication

User input is captured by the `PromptInput.tsx` component. The `ChatBot.tsx` component utilizes the `useChat` hook provided by the `@ai-sdk/react` library to manage the chat session.

When a user submits a message:
1.  The `input` state managed by `useChat` is updated.
2.  The `append` function (or a similar function from `useChat`) is called to send the message to the backend.
3.  The `useChat` hook internally makes a POST request to the `/api/chat` backend endpoint.
4.  The `experimental_prepareRequestBody` function within `ChatBot.tsx` plays a crucial role in formatting the request body before it's sent. It ensures that necessary information like the current thread ID, selected model, tool choices, and the latest message are included in the `ChatApiSchemaRequestBody` format.

### Handling Streaming Responses

The frontend is designed to handle streaming responses from the backend, allowing for a real-time chat experience:

*   As the backend processes the request and the LLM generates a response, chunks of data are sent back to the frontend.
*   The `useChat` hook automatically handles these incoming streams.
*   Messages are incrementally updated in the UI as new data arrives. This includes:
    *   **Text:** New text tokens are appended to the assistant's message.
    *   **Tool Call Information:** If the LLM decides to use a tool, this information is streamed and displayed, potentially allowing the user to see which tool is being called and with what arguments. `PreviewMessage.tsx` is responsible for rendering these tool calls.
    *   **Annotations:** Any annotations or structured data sent along with the message parts are also processed and can be used to render richer UI elements or provide additional context. The `ChatMessageAnnotation` type suggests that annotations can include tool choice information.

### State Management

Global application state relevant to the chat interface is managed using Zustand. The `appStore` is used to store and mutate state such as:

*   The current `model` being used.
*   `toolChoice` preferences.
*   Information about `allowedAppDefaultToolkit` and `allowedMcpServers`.
*   The list of chat `threadList`.
*   The `currentThreadId`.

Components can subscribe to `appStore` using hooks like `useShallow` to react to state changes and update their rendering accordingly. For example, `ChatBot.tsx` uses `appStore` to access and update the current thread ID and other global settings.

## Deep Dive into the Backend

The backend, primarily handled by `src/app/api/chat/route.ts`, is responsible for processing user requests, interacting with the Large Language Model (LLM), managing data, and orchestrating tool usage via Master Control Programs (MCPs).

### Request Handling Flow

When a request hits the `/api/chat` endpoint (the `POST` function in `route.ts`):
1.  The request body is parsed (expected to match `chatApiSchemaRequestBodySchema`).
2.  **User Authentication:** The session is retrieved using `getSession()` (from `auth/server`). If no user ID is found, an "Unauthorized" response is returned.
3.  **Thread Management:**
    *   `chatRepository.selectThreadDetails(id)` (from `lib/db/repository.ts`) is called to fetch existing thread details.
    *   If the thread doesn't exist, a new one is created:
        *   A title is generated using `generateTitleFromUserMessageAction`.
        *   `chatRepository.insertThread` creates the new thread associated with the user.
4.  **Message Preparation:** Previous messages from the thread are retrieved and converted to the format expected by the AI SDK using `convertToMessage`.
5.  **Tool Preparation:** MCP tools are fetched and filtered based on various criteria (see MCP Integration).
6.  **LLM Interaction:** The request is passed to the `streamText` function to get a response from the LLM.
7.  **Response Streaming:** The backend streams the LLM's response (including text, tool calls, and annotations) back to the frontend using `createDataStreamResponse` and `result.mergeIntoDataStream`.
8.  **Message Persistence:** User messages and assistant responses (including usage and annotations) are saved to the database via `chatRepository.insertMessage` and `chatRepository.upsertMessage`.

### Core Operations

*   **User Authentication:** Handled by `getSession()` from `src/lib/auth/server.ts` (imported as `auth/server`), ensuring that only authenticated users can access the chat functionalities.
*   **Thread and Message Management:** The `chatRepository` (an instance of `pgChatRepository` from `src/lib/db/pg/repositories/chat-repository.pg.ts`, exposed via `src/lib/db/repository.ts`) is responsible for all database interactions related to threads and messages. This includes selecting, inserting, and updating these records.
*   **System Prompt Construction:**
    *   System prompts are crucial for guiding the LLM's behavior. They are built by combining user-specific and project-specific instructions.
    *   `buildUserSystemPrompt` (from `src/lib/ai/prompts.ts`) creates a prompt with user context (name, email, profession, preferred response style) and current system time.
    *   `buildProjectInstructionsSystemPrompt` (from `src/lib/ai/prompts.ts`) adds project-specific instructions if they exist for the current thread.
    *   These are merged using `mergeSystemPrompt` (a helper in `route.ts`).

### LLM Model Selection

*   The backend supports multiple LLM providers and models.
*   The `customModelProvider` object (from `src/lib/ai/models.ts`) is used to select the appropriate LLM.
*   `customModelProvider.getModel(modelName)` takes a model name (e.g., "gpt-4o", "claude-3-5-sonnet") sent from the frontend and returns the corresponding `LanguageModel` instance (e.g., from OpenAI, Anthropic, Google, Ollama providers).
*   If a requested model is not found, it defaults to a fallback model (e.g., `allModels.openai[DEFAULT_MODEL]`).
*   The `isToolCallUnsupportedModel` function checks if the selected model supports tool calls.

### MCP Integration

Master Control Programs (MCPs) provide a way to dynamically offer tools (functions the LLM can call) to the LLM.

*   **`mcpClientsManager`**:
    *   Imported from `src/lib/ai/mcp/mcp-manager.ts`, this object is responsible for managing and providing all available MCP tools.
    *   It can be configured to use different storage backends for MCP configurations (file-based or database-based, as seen in `mcp-manager.ts`).
    *   `mcpClientsManager.tools()` fetches the collection of available tools.
*   **Tool Filtering and Selection (`route.ts` logic):**
    *   The system first checks if tool calls are allowed for the selected model (`isToolCallUnsupportedModel`) and if the user's `toolChoice` preference is not "none".
    *   **Mentions:** If `requiredToolsAnnotations` (extracted from the user's message annotations) exist, tools are filtered by `filterToolsByMentions` to include only those explicitly mentioned.
    *   **Allowed MCP Servers:** Otherwise, tools are filtered by `filterToolsByAllowedMCPServers` based on the `allowedMcpServers` list from the request. This allows for selecting tools from specific MCP instances (e.g., a `custom-mcp-server` if configured and allowed).
    *   **Tool Choice Preference:**
        *   If `toolChoice` is "manual", tool execution capabilities are excluded using `excludeToolExecution` (meaning the LLM can suggest a tool, but the frontend will handle the execution decision).
    *   **Default Toolkit:** `getAllowedDefaultToolkit` adds any default tools permitted by `allowedAppDefaultToolkit`.
*   The final set of `tools` is passed to the LLM. The concept of different MCP servers (e.g., the `custom-mcp-server/index.ts` in the codebase) allows for extending the system with custom toolsets.

### Interaction with LLM

*   The primary interaction with the LLM is handled by the `streamText` function from the Vercel AI SDK (`ai` library).
*   The following information is passed to `streamText`:
    *   `model`: The selected `LanguageModel` instance.
    *   `system`: The combined system prompt.
    *   `messages`: The history of messages in the current chat, including the latest user message (or tool results).
    *   `tools`: The filtered set of tools available for the LLM to use.
    *   `toolChoice`: Dynamically set. If `requiredToolsAnnotations` are present and a tool is in progress, it's set to `"required"`; otherwise, it's typically `"auto"`, allowing the LLM to decide when to use tools.
    *   Other parameters like `maxSteps`, `experimental_continueSteps`, `experimental_transform` (for smooth streaming) are also configured.

### Tool Call and Result Lifecycle

1.  **LLM Requests Tool Call:** During response generation, the LLM can decide to call one of the provided tools. It outputs a special message part indicating the tool name and input arguments.
2.  **Backend Handles Tool Call:**
    *   The `streamText` function's output stream includes these tool call requests.
    *   If a tool call is "manual" (due to `toolChoice: "manual"` or if it's a step in a multi-step tool interaction that requires user confirmation), the backend might not execute it directly. The `extractInProgressToolPart` and `manualToolExecuteByLastMessage` functions in `route.ts` handle scenarios where a tool execution is pending based on prior messages.
    *   `manualToolExecuteByLastMessage`: If a tool call requires manual execution (e.g., user confirms via frontend), this function is invoked. It receives the `inProgressToolStep` and the user's message (which might contain the answer/confirmation).
    *   The result of the tool execution is then prepared.
3.  **Result Sent Back to LLM:**
    *   If a tool was executed (either automatically by the LLM's first decision or via the manual flow), its result needs to be sent back to the LLM.
    *   In the `manualToolExecuteByLastMessage` flow, `assignToolResult` updates the message history with the tool's output.
    *   The `streamText` function is designed to handle this lifecycle: when it yields a tool call, it expects a corresponding tool result to be provided in a subsequent step of the `messages` array for it to continue processing. The `experimental_continueSteps: true` option facilitates this.
    *   The backend writes a `tool_result` part to the data stream for the frontend using `formatDataStreamPart`.

### Streaming Responses to Frontend

The backend leverages the Vercel AI SDK to stream responses:
*   `createDataStreamResponse` initializes a stream.
*   The `execute` callback within `createDataStreamResponse` is where the main logic resides.
*   `result.mergeIntoDataStream(dataStream, { sendReasoning: true })` takes the output from `streamText` (which includes text, tool calls, tool results, and other data) and forwards it into the response stream destined for the frontend.
*   The frontend receives these parts incrementally:
    *   Text content.
    *   Tool call information (which tool to call with what arguments).
    *   Tool result information.
    *   Annotations (e.g., `usageTokens`, `toolChoice` used for the turn), which are written using `dataStream.writeMessageAnnotation`. This allows the frontend to update the UI in real-time.

## Explain the LLM's Role and Interaction

The Large Language Model (LLM) is the core intelligence of the system, responsible for understanding user queries, generating human-like responses, and deciding when to leverage external tools to fulfill requests.

### LLM Processing

The backend provides the LLM with a carefully constructed context for each user interaction. This context typically includes:

*   **Chat History:** A list of previous messages in the conversation (both user and assistant turns, including past tool calls and their results). This allows the LLM to maintain conversational context.
*   **System Prompt:** A set of instructions that defines the LLM's persona, objectives, constraints, and any relevant information about the user or project (as constructed by `buildUserSystemPrompt` and `buildProjectInstructionsSystemPrompt`).
*   **Available Tools:** A list of tools (functions) that the LLM can request to be called. These tools are dynamically provided and filtered by the backend (via `mcpClientsManager` and logic in `route.ts`).

The LLM processes this entire input to understand the user's current query in the broader context of the conversation and its defined operational guidelines.

### Types of LLM Responses

Based on its processing, the LLM can generate different types of responses, which are then handled by the backend:

*   **Text Generation:** This is the most common form of response, where the LLM generates a textual answer or continuation of the conversation. The `streamText` function facilitates receiving this text, often in chunks for a streaming effect on the frontend.
*   **Tool Invocation Requests:** If the LLM determines that it needs external information or capability to address the user's query, it can request to use one of the tools provided to it.
    *   This is not a direct execution of the tool by the LLM. Instead, the LLM outputs a structured request (as part of the Vercel AI SDK message format) specifying the `toolName` and the `input` (arguments) for that tool.
    *   The backend (`route.ts`) receives this structured request, identifies the intended tool, and then is responsible for actually executing it (or managing its execution, especially in "manual" tool choice scenarios).

### Augmenting Capabilities with Tools

The ability to invoke tools significantly augments the LLM's capabilities beyond simple text generation. Tools, provided via the Master Control Program (MCP) framework, act as extensions that allow the LLM to:

*   **Access Real-time Data:** Fetch current information from databases or external APIs (e.g., weather updates, stock prices, project statuses).
*   **Interact with Other Services:** Connect to and operate other systems or services (e.g., send an email, create a calendar event, query a specialized database).
*   **Perform Specific Computations:** Execute complex calculations or data manipulations that are not inherently built into the LLM's core functions (e.g., running a code interpreter, performing statistical analysis).
*   **Provide Structured Data:** Tools can be designed to return structured data (like JSON) which can then be formatted by the LLM or directly used by the frontend to render rich UI elements (e.g., charts, diagrams).

By requesting tool invocations, the LLM can gather necessary information or trigger actions, and then use the results from these tools to formulate a more accurate, comprehensive, or actionable response to the user. This interaction cycle (LLM -> tool call -> backend executes tool -> tool result -> LLM processes result -> final response) is key to handling complex queries.

## System Architecture Diagrams

This section provides visual representations of the system's architecture and key interaction flows using Mermaid.js diagrams.

### High-Level Architecture Diagram

This diagram shows the main components of the system and their primary interactions.

```mermaid
graph TD
    User["👤 User"] --> Frontend["🌐 Frontend (Browser)"];
    Frontend --> Backend_API["⚙️ Backend API Server"];
    Backend_API --> LLM_Service["🧠 LLM Service"];
    Backend_API --> MCP_Manager["🛠️ MCP Manager"];
    Backend_API --> Database["🗄️ Database"];
    MCP_Manager --> Custom_MCP_Server["🔌 Custom MCP Server/Clients"];
    LLM_Service --> Backend_API;
    Backend_API --> Frontend;
    Frontend --> User;
end
```

### Chat Message Flow (with Tool Call) - Sequence Diagram

This diagram illustrates the sequence of interactions when a user sends a message that results in an LLM tool call.

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 🌐 Frontend
    participant Backend_API as ⚙️ Backend API
    participant LLM_Service as 🧠 LLM Service
    participant MCP_Tool as 🔌 MCP Tool

    User->>Frontend: Types and sends message
    Frontend->>Backend_API: POST /api/chat with message
    Backend_API->>LLM_Service: streamText(user_message, chat_history, system_prompt, available_tools)
    LLM_Service-->>Backend_API: Request tool_call(tool_name, arguments)
    Backend_API->>MCP_Tool: Execute tool_name(arguments)
    MCP_Tool-->>Backend_API: Return tool_result
    Backend_API->>LLM_Service: Provide tool_result to continue stream
    LLM_Service-->>Backend_API: Stream final response text (incorporating tool_result)
    Backend_API-->>Frontend: Stream data (text, UI annotations, tool_call_info, tool_result_info)
    Frontend-->>User: Display complete response & UI updates
end
```

### MCP Architecture Diagram

This diagram illustrates the components of the Master Control Program (MCP) system, which manages and provides tools to the LLM.

```mermaid
graph TD
    subgraph Backend System
        Direction LR
        Backend_API["⚙️ Backend API Server"]
        MCP_Manager["🛠️ MCP Manager"]
    end

    subgraph MCP Infrastructure
        Direction LR
        MCP_Config_Storage["💾 MCP Config Storage <br>(File or Database)"]
        Custom_MCP_Server["🔌 Custom MCP Server/Client 1"]
        External_MCP_Service["🔌 External MCP Service/Client 2"]
        Another_MCP_Tool["🔌 Another MCP Tool/Client N"]
    end

    Backend_API -->|1. Requests available tools| MCP_Manager;
    MCP_Manager -->|2. Loads configurations| MCP_Config_Storage;
    MCP_Manager -->|3. Initializes/Interacts with| Custom_MCP_Server;
    MCP_Manager -->|3. Initializes/Interacts with| External_MCP_Service;
    MCP_Manager -->|3. Initializes/Interacts with| Another_MCP_Tool;
    Custom_MCP_Server -->|4. Provides tool schemas| MCP_Manager;
    External_MCP_Service -->|4. Provides tool schemas| MCP_Manager;
    Another_MCP_Tool -->|4. Provides tool schemas| MCP_Manager;
    MCP_Manager -->|5. Returns aggregated tools| Backend_API;
end
```

## Conclusion

This system architecture document provides a comprehensive overview of the chat application's components and their interactions. From the user's engagement with the React-based frontend to the intricate workings of the backend involving the LLM, MCP tool integration, and data persistence, each part plays a vital role. The diagrams further illustrate these relationships, offering a clear visual guide to understanding the data flow and operational sequences within the application. This modular and extensible architecture allows for robust conversational AI experiences.
