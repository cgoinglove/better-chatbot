# Better Chatbot iOS and Android Expo App Plan

Research snapshot: 2026-07-07.

Scope for this planning pass:
- Build a generic native Expo app for iOS and Android that matches the upstream Better Chatbot web UI and uses this Next.js app as the backend.
- Include sign in, sign up, social login, signed-in welcome/empty chat, persistent chat, and temporary chat.
- Do not edit MCP configuration, workflow behavior, GitHub workflows, or create new folders in this pass.
- Treat MCPs, agents, workflows, model config, providers, storage, and rate limits as server-owned capabilities surfaced through APIs.

## Project Findings

This repository is the upstream Better Chatbot web app, a Next.js 16 / React 19.2 chat application. It uses:
- Better Auth with email/password plus GitHub, Google, and Microsoft when env vars are configured.
- Drizzle/Postgres for users, sessions, chat threads, messages, MCP servers, customizations, agents, workflows, archives, and bookmarks.
- AI SDK 5 for streaming `UIMessage` chat responses.
- shadcn-style UI, Radix primitives, Tailwind CSS 4 tokens, Lucide icons, Zustand persisted app state, SWR data fetching, and Biome.

Relevant backend surfaces already exist:
- `POST /api/chat`: persistent streaming chat endpoint.
- `POST /api/chat/temporary`: ephemeral streaming chat endpoint.
- `GET /api/thread`: current user's thread list.
- `GET /api/chat/models`: enabled model/provider list.
- `POST /api/chat/title`: title generation/upsert.
- `POST /api/storage/upload-url` and `POST /api/storage/upload`: file upload paths.
- `GET /api/user/details` and `GET/POST /api/user/preferences`: current user and preferences.
- `GET/POST /api/mcp/*`, `GET/POST /api/agent/*`, `GET/POST /api/workflow/*`: advanced server-managed capability APIs.
- `GET/POST /api/auth/[...all]`: Better Auth handler.

Important mobile integration gaps:
- Some chat operations used by the web app are server actions, not mobile-friendly HTTP routes: select thread with messages, delete message, delete thread, rename thread, delete all threads, delete messages after timestamp for regeneration, auth config discovery, and storage info.
- The web app's `useChat` request body is richer than a text-only chat: it sends `UIMessage`, `chatModel`, `toolChoice`, `mentions`, `allowedMcpServers`, `allowedAppDefaultToolkit`, `imageTool`, and `attachments`.
- Mobile must preserve AI SDK `UIMessage.parts`, because the app renders text, reasoning, tool parts, files, source URLs, workflow outputs, image outputs, and manual tool confirmations.

## App UI UX

Core app shape:
- Signed-out users land on a native auth screen, not a webview.
- Signed-in users land directly on an empty chat/welcome screen, matching the web app's current `/` behavior.
- The first viewport should be the actual chat product: greeting, model/tool context, and composer.
- The app should feel like a native ChatGPT/Claude-style chat app while keeping Better Chatbot's compact shadcn UI language.

Primary navigation:
- Use Expo Router with protected route groups.
- Initial mobile surface should stay small:
  - Auth stack: sign in, sign up, email sign-up steps, social auth callback.
  - Chat stack: welcome/new chat, chat thread detail, temporary chat.
  - Drawer or sheet: recent chats and user/session actions.
- Avoid exposing web-only admin, MCP editor, workflow editor, and folder-level organization in the first mobile release.

Signed-out flow:
- Sign in:
  - Email and password fields.
  - Google, GitHub, Microsoft buttons only when backend reports they are enabled.
  - Clear disabled/loading/error states.
- Sign up:
  - Same three-step structure as web email signup: email, name, password.
  - Show password checklist: 8-20 chars, one letter, one number.
  - First-user/admin copy should be supported if backend exposes that state.
- Social login:
  - Use native browser session and app scheme callback.
  - Return to chat root after successful auth.

Signed-in welcome screen:
- Full-height chat canvas.
- Greeting using current user name and time-aware phrasing, matching `ChatGreeting`.
- Composer anchored above the keyboard with safe-area padding.
- New thread ID generated client-side before first send, same as web.
- Model picker available from composer or header.
- Temporary chat entry available from the header or an action sheet.

Persistent chat screen:
- Render messages in a performant inverted/non-inverted `FlashList`.
- User messages remain right-aligned compact bubbles.
- Assistant messages remain unframed text-first responses with markdown.
- Preserve actions from web where useful:
  - Copy.
  - Retry/regenerate.
  - Edit previous user message.
  - Delete message.
  - Delete/rename thread.
  - Stop streaming.
  - Scroll to bottom.
- Render important `UIMessage.parts`:
  - `text`: markdown, code blocks, lists, tables where possible.
  - `reasoning`: collapsible "thinking" region.
  - `tool-*`: compact expandable tool card with status, input/output, approval actions for manual mode.
  - `file`: thumbnail/file chip.
  - `source-url`: link chip.
  - workflow outputs: summarized expandable card, not a full workflow editor.
- Show rate-limit errors using the existing structured message format from the backend.

Temporary chat:
- Separate temporary chat modal/screen.
- No thread persistence.
- Uses `/api/chat/temporary`.
- Supports model selection and optional temporary instructions.
- Does not expose MCP/workflow editing.
- Can later support temporary mentions if backend parity is needed.

Composer:
- Multiline text input with native keyboard handling.
- Send button when text exists; stop button during streaming.
- Add menu for files/images and image generation.
- File preview tray before send.
- Mention support can be phased:
  - Phase 1: no typed `@` autocomplete; use current globally allowed MCP/tool settings from backend.
  - Phase 2: native mention picker for MCP tools, default tools, agents, and workflows.
- Preserve `toolChoice`: auto, manual, none. Manual tool calls require a native confirmation UI.

Thread list:
- Recent chats grouped by Today, Yesterday, Last Week, Older.
- Pull to refresh.
- Swipe actions for rename/delete.
- New chat button.
- No folders in the initial plan.

## Design

Design goal:
- 1:1 product behavior with the web chat, translated into native interaction patterns.
- Do not copy desktop layout literally. The web sidebar/header/composer should become native drawer/sheets/header/composer.

Visual language:
- Base palette: neutral shadcn tokens from `src/app/globals.css`.
- Keep the current restrained surfaces:
  - white/dark background,
  - muted composer,
  - subtle borders,
  - compact controls,
  - Lucide-style iconography,
  - small labels,
  - no marketing hero.
- Use native haptics for send, stop, destructive actions, and tool approval.

Liquid Glass strategy:
- Use Liquid Glass only for navigation chrome and key floating controls, not message content.
- iOS 26+:
  - Use Expo Router Native Tabs if a tab surface is added.
  - Use `expo-glass-effect` `GlassView` for composer/header overlays where it improves native feel.
  - Keep readability first: tint glass surfaces and avoid heavy transparency over dense chat text.
- iOS below 26 and Android:
  - Fall back to opaque/blurred shadcn-like muted surfaces.
  - Android should use Material 3-style native affordances where Expo UI provides them.
- Do not depend on third-party Liquid Glass for the first version unless Expo's first-party APIs block a required interaction.

Component translation:
- Web `Button`, `Input`, `Card`, `Dialog`, `Dropdown`, `Sheet` become local RN primitives copied/owned in shadcn style.
- Use bottom sheets/action sheets for web dropdowns.
- Use native context menus only for lightweight message/thread actions.
- Cards should be reserved for repeated items, tool outputs, file chips, and dialogs.

Accessibility:
- Dynamic type support without layout overlap.
- Minimum 44px touch targets.
- Screen reader labels for icon buttons.
- High contrast fallback for all glass surfaces.
- Keyboard avoidance tested on iOS and Android.

## Tech Stack

Recommended baseline:
- Expo SDK 57, which currently targets React Native 0.86 and React 19.2.3 per Expo docs.
- Expo Router `~57.x` for file-based native routing.
- TypeScript.
- EAS Build and development builds for iOS/Android.

Auth:
- Better Auth Expo integration with `@better-auth/expo`.
- `expo-secure-store` for secure cookie/session storage.
- `expo-linking`, `expo-web-browser`, and app scheme for social login callbacks.
- Backend needs Better Auth Expo server plugin/trusted origins for the mobile scheme.

Chat/data:
- Keep AI SDK `UIMessage` types as the shared message format.
- Use `@ai-sdk/react` if streaming works cleanly in the chosen Expo runtime.
- If RN streaming transport is unreliable on target devices, build a small custom SSE/fetch stream reader while keeping the same `UIMessage` state shape.
- TanStack Query or SWR-equivalent query layer for API data. I would choose TanStack Query on mobile for offline/retry/cache controls.
- Zustand for local UI state to mirror web app state: selected model, tool choice, allowed tool settings, temporary chat state, current thread, draft files.
- `expo-file-system` plus existing storage endpoints for upload.

UI and styling:
- Primary choice: NativeWind v5 plus React Native Reusables-style copied components.
  - Best fit because the web app is already shadcn/Tailwind/token driven.
  - Components are owned in the app and can match web naming and variants.
- Use `lucide-react-native` for icons.
- Use `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, and `react-native-keyboard-controller`.
- Use `@shopify/flash-list` for long chat lists.
- Use `@expo/ui` selectively for native SwiftUI/Jetpack Compose controls when it improves fidelity without fragmenting the design system.

Alternatives considered:
- gluestack-ui v5: strong copy-paste NativeWind/Tailwind v4 option, useful if a fuller ready-made component set is desired.
- Tamagui: powerful universal system, but heavier and less aligned with the current shadcn/Tailwind repo unless web/mobile code sharing becomes a major goal.
- Uniwind: promising Tailwind v4 performance story, but NativeWind plus React Native Reusables is the lower-risk starting point for shadcn parity.
- Unistyles 3: strong performance styling, but it adds native-code requirements and moves away from class-based shadcn ergonomics.

Rendering:
- Markdown: `react-native-markdown-display` or a controlled markdown renderer with custom code/table components.
- Code blocks: start with readable monospace cards, then add syntax highlighting if needed.
- Mermaid/charts/artifacts: initially render as summarized attachments/tool cards; later use WebView or native chart components for parity.

Testing:
- Unit tests with Vitest where shared TS logic can be reused.
- Expo app tests with Jest/React Native Testing Library.
- E2E with Maestro or Detox. Maestro is likely better for early Expo dev-UX.

## Implementation High-Level Plan

Phase 0: Backend contract audit
- Add an OpenAPI-ish mobile contract document before implementation.
- Confirm final request/response bodies for:
  - auth config,
  - current session/user,
  - thread list,
  - thread detail,
  - thread rename/delete,
  - message delete,
  - regenerate from message,
  - persistent chat stream,
  - temporary chat stream,
  - model list,
  - storage info/upload.
- Decide if mobile lives in this monorepo later or starts as a separate Expo app. No folders are created in this planning pass.

Phase 1: Mobile-safe API additions
- Add HTTP route equivalents for current server actions needed by mobile:
  - `GET /api/mobile/auth/config`
  - `GET /api/thread/:id` or `GET /api/chat/thread/:id`
  - `PATCH /api/thread/:id`
  - `DELETE /api/thread/:id`
  - `DELETE /api/chat/message/:id`
  - `POST /api/chat/regenerate`
  - `GET /api/storage/info`
- Keep authorization identical to existing server actions.
- Do not change MCP, workflow, or provider execution behavior.

Phase 2: Expo app shell
- Initialize Expo SDK 57 app when implementation begins.
- Configure app scheme, deep links, EAS profiles, native safe areas, fonts, and theme tokens.
- Set up Better Auth Expo client against this Next.js backend.
- Implement protected navigation.

Phase 3: Auth screens
- Native sign-in screen.
- Native sign-up selector.
- Native email sign-up steps.
- Social login buttons driven by backend config.
- Session restore and sign out.

Phase 4: Chat foundation
- Build API client that attaches Better Auth cookies from SecureStore.
- Build model list query and selected model persistence.
- Build new chat route with generated UUID.
- Build chat stream client for `/api/chat`.
- Render `UIMessage.parts` enough for text, markdown, files, reasoning, errors, and basic tool cards.

Phase 5: Composer and files
- Multiline composer with keyboard controller.
- Send/stop states.
- File picker and image picker.
- Upload via existing storage endpoints.
- Attachment parts in the same shape as web.

Phase 6: Thread UX
- Recent thread drawer/sheet.
- Thread groups by date.
- Rename/delete thread.
- Delete message.
- Regenerate from previous user message.
- Title generation flow after first exchange.

Phase 7: Temporary chat
- Temporary chat modal/screen.
- Temporary instructions.
- Temporary model selection.
- Stream responses from `/api/chat/temporary`.

Phase 8: Tool/MCP parity
- Read allowed MCP/default tool state from backend.
- Preserve global `toolChoice`.
- Native manual tool approval card.
- Native mention picker for agents, MCP servers/tools, default tools, and workflows.
- Do not add MCP editing or workflow editing in mobile v1.

Phase 9: Polish and release
- iOS Liquid Glass pass for composer/header/native tabs on iOS 26+.
- Android Material/native controls pass.
- Offline/session expiry states.
- Push-ready architecture, but no notifications unless explicitly scoped.
- Accessibility and device matrix testing.
- EAS preview builds for TestFlight/internal testing.

## Risks and Decisions

- Streaming on React Native must be validated early. The backend already emits AI SDK UI streams; mobile should either use AI SDK Expo support or a custom stream reader with the same message format.
- Better Auth mobile needs backend trusted origins and Expo plugin support. Without that, social login callbacks and cookie persistence will be brittle.
- A literal 1:1 web UI is not desirable on mobile. The target should be behavioral parity plus native layout.
- Liquid Glass is iOS 26+ only through Expo's first-party glass effect. Android and older iOS require polished fallbacks.
- MCP/workflow execution should stay server-side. Mobile only selects/invokes what the backend exposes.

## Research Sources

- Expo SDK latest version matrix: https://docs.expo.dev/versions/latest/
- React Native release status: https://reactnative.dev/docs/releases
- Expo Router native tabs and Liquid Glass tabs: https://docs.expo.dev/router/advanced/native-tabs/
- Expo GlassEffect: https://docs.expo.dev/versions/latest/sdk/glass-effect/
- Expo UI: https://docs.expo.dev/versions/latest/sdk/ui/
- Expo Tailwind guidance: https://docs.expo.dev/guides/tailwind/
- NativeWind v5 installation: https://www.nativewind.dev/v5/getting-started/installation
- React Native Reusables: https://reactnativereusables.com/
- gluestack-ui installation: https://gluestack.io/ui/docs/home/getting-started/installation
- Tamagui: https://tamagui.dev/
- Unistyles 3 prerequisites: https://unistyl.es/v3/start/getting-started/
- Better Auth Expo integration: https://better-auth.com/docs/integrations/expo
- Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/
- AI SDK Expo quickstart: https://ai-sdk.dev/docs/getting-started/expo
- AI SDK `useChat`: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
- Apple Liquid Glass overview: https://developer.apple.com/documentation/technologyoverviews/liquid-glass


---


# Assesment

What's Good (SOTA-aligned)

  Correct tech picks:
  - AI SDK 5.0.116 with @ai-sdk/react — the Expo quickstart exists, and DefaultChatTransport should work on RN with proper polyfills
  - Better Auth 1.4.9 + @better-auth/expo — correct integration path
  - Expo SDK 57 / RN 0.86 / React 19 — current
  - NativeWind v5 + React Native Reusables — best match for this shadcn/Tailwind codebase
  - TanStack Query over SWR for mobile — correct call (offline/retry matters more on mobile)

  Accurate gap analysis:
  - The 7 server actions that need HTTP routes are correctly identified
  - The rich prepareSendMessagesRequest body with mentions, toolChoice, allowedMcpServers, attachments — correctly captured
  - Auth needs trustedOrigins + Expo plugin — confirmed, neither exists yet
  - sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls pattern for auto tool execution — not mentioned (minor gap)

  ---
  Concerns for POC Readiness

  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────┐
  │                                                      Issue                                                       │               Impact                │
  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┤
  │ No POC scope cut — phases 0-9 are all "v1". A POC should be phases 0-4 only (auth + single chat stream + basic      │ High — team won't know when POC  │
  │ rendering).                                                                                                         │ is "done"                        │
  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────┤
  │ Streaming transport risk unresolved — plan says "validate early" but doesn't specify a spike task. ReadableStream       │ High — this is the #1        │
  │ polyfill status on Hermes/JSC matters.                                                                                  │ technical risk               │
  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────┤
  │ CORS not mentioned — mobile requests from a native app won't have an Origin header in the same way, but better-auth     │ Medium                       │
  │ cookie validation and any middleware checks need to account for this.                                                   │                              │
  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────┤
  │ sendAutomaticallyWhen not addressed — the web app auto-sends when the last assistant message has complete tool calls.   │ Low for POC, high for v1     │
  │ Mobile needs the same behavior for tool chains to work.                                                                 │                              │
  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────┤
  │ Monorepo vs. separate repo undecided — plan explicitly defers this. For POC, just start separate.                       │ Low                          │
  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────┤
  │ No acceptance criteria — what does "POC done" look like? Suggest: sign in, send one message, see streamed response      │ Medium                       │
  │ render with markdown.                                                                                                   │                              │
  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────┘

  ---
  Recommendations to Ship a POC

  1. Define POC as phases 0-2-3-4 only — backend routes, app shell, auth, basic chat. Skip threads list, temporary chat, files, tool approval, Liquid Glass,
  and polish.
  2. Add a "Phase 0.5: Streaming spike" — before building screens, prove @ai-sdk/react useChat works on Expo with this backend's UIMessageStreamResponse. If it
  doesn't, you need the custom SSE reader. This is a 1-day task that de-risks everything.
  3. Start the Expo app in a separate repo — the plan already says "no folders in this pass." For a POC, a standalone repo with the backend URL as an env var
  is faster to iterate on.
  4. Add 3 backend routes minimum for POC:
    - GET /api/thread/:id (thread + messages) — needed to rehydrate a chat
    - GET /api/mobile/auth/config (which social providers are enabled)
    - GET /api/storage/info (can skip for POC actually)
  5. Skip mentions, tool approval, attachments for POC — just send toolChoice: "auto" and let tools execute server-side without manual confirmation. Render
  tool parts as read-only cards.

  ---
  Bottom Line

  The plan is well-researched and the technical choices are current/correct. It's ready to guide full development. For a POC specifically, cut scope to "auth +
  streaming chat works on device" and add the streaming validation spike as the very first implementation task. The biggest real risk is streaming transport
  compatibility — everything else is standard Expo development.
