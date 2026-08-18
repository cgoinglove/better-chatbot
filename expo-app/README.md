# Better Chatbot Expo App

Native iOS and Android client for the Better Chatbot backend in this repository.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_BACKEND_URL` to the reachable Next.js backend URL.
   - iOS simulator can usually use `http://localhost:3000`.
   - Android emulator usually needs `http://10.0.2.2:3000`.
   - Physical devices need a LAN or tunneled URL.
3. Run `pnpm install` inside `expo-app`.
4. Start the backend with `NO_HTTPS=1 pnpm dev` from the repository root.
5. Start mobile with `pnpm start` inside `expo-app`.

The app uses Better Auth Expo session storage, native auth screens, persistent
chat, temporary chat, model selection, thread list actions, message actions,
and file/image attachment upload through the existing backend storage APIs.
