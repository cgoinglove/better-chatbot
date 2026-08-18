import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { BACKEND_URL, APP_SCHEME } from "./config";

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: "better-chatbot",
      cookiePrefix: "better-auth",
      storage: SecureStore,
    }),
  ],
});

export type AuthClient = typeof authClient;
