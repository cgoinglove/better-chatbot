export const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const APP_SCHEME = "betterchatbot";
