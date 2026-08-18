# Mobile API Contract

This document records the backend contract used by `expo-app`. It is intentionally
HTTP-focused so native clients do not depend on Next.js server actions.

## Auth

- `GET /api/mobile/auth/config`
  - Returns email/password availability, sign-up availability, first-user state,
    enabled social providers, backend base URL, and auth base path.
- `GET/POST /api/auth/[...all]`
  - Better Auth handler with Expo plugin support.
  - Native clients use `@better-auth/expo/client` with SecureStore-backed cookie
    persistence.

## Threads

- `GET /api/thread`
  - Returns the signed-in user's thread list with `lastMessageAt`.
- `GET /api/thread/:id`
  - Returns a thread plus messages after verifying ownership.
- `PATCH /api/thread/:id`
  - Body: `{ "title": string }`.
  - Renames a thread after verifying ownership.
- `DELETE /api/thread/:id`
  - Deletes a thread after verifying ownership.

## Chat

- `POST /api/chat`
  - Persistent UI message stream endpoint.
  - Body includes `id`, `message`, `chatModel`, `toolChoice`, `mentions`,
    `allowedMcpServers`, `allowedAppDefaultToolkit`, `imageTool`, and
    `attachments`.
- `POST /api/chat/temporary`
  - Temporary UI message stream endpoint.
  - Body: `{ "messages": UIMessage[], "chatModel"?: ChatModel,
    "instructions"?: string }`.
- `POST /api/chat/title`
  - Streams a generated title and upserts it into the thread.
- `DELETE /api/chat/message/:id`
  - Deletes a message after verifying ownership through its thread.
- `POST /api/chat/regenerate`
  - Body: `{ "messageId": string }`.
  - Deletes the target message and later messages in the same thread after
    verifying ownership.
- `GET /api/chat/models`
  - Returns enabled provider/model metadata.

## Storage

- `POST /api/storage/upload`
  - Multipart fallback upload endpoint. Field name: `file`.

## Advanced Capabilities

MCP, agents, workflows, default tools, image generation, storage, rate limits,
and provider execution remain server-owned. Mobile clients pass selection state
through the chat request body and render returned `UIMessage.parts`.
