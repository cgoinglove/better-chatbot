import { Platform, StyleSheet } from "react-native";

// Mirrors the default shadcn tokens in src/app/globals.css.
export const colors = {
  background: "#ffffff",
  foreground: "#18181b",
  foregroundSoft: "#27272a",
  card: "#ffffff",
  cardForeground: "#18181b",
  popover: "#ffffff",
  popoverForeground: "#18181b",
  primary: "#27272a",
  primaryForeground: "#fafafa",
  secondary: "#f4f4f5",
  secondaryForeground: "#27272a",
  muted: "#f4f4f5",
  mutedSoft: "rgba(244,244,245,0.6)",
  mutedForeground: "#71717a",
  accent: "#f4f4f5",
  accentForeground: "#27272a",
  destructive: "#e11d48",
  destructiveSoft: "#fff1f2",
  border: "#e4e4e7",
  input: "#e4e4e7",
  ring: "#a1a1aa",
  sidebar: "#fafafa",
  success: "#16a34a",
  warning: "#b45309",
  transparent: "transparent",
  overlay: "rgba(24,24,27,0.28)",
};

export const darkColors = {
  background: "#09090b",
  foreground: "#fafafa",
  foregroundSoft: "#e4e4e7",
  card: "#09090b",
  cardForeground: "#fafafa",
  popover: "#09090b",
  popoverForeground: "#fafafa",
  primary: "#fafafa",
  primaryForeground: "#18181b",
  secondary: "#27272a",
  secondaryForeground: "#fafafa",
  muted: "#18181b",
  mutedSoft: "rgba(24,24,27,0.74)",
  mutedForeground: "#a1a1aa",
  border: "#27272a",
  input: "#27272a",
  accent: "#27272a",
  accentForeground: "#fafafa",
  destructive: "#f87171",
  destructiveSoft: "#450a0a",
  ring: "#71717a",
  sidebar: "#18181b",
  success: "#4ade80",
  warning: "#fbbf24",
  transparent: "transparent",
  overlay: "rgba(0,0,0,0.4)",
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  "2xl": 18,
  "3xl": 24,
  "4xl": 32,
  pill: 999,
};

export const spacing = {
  pageX: 24,
  screenX: 16,
  composerX: 20,
  maxContent: 768,
  maxUserBubble: 672,
  control: 36,
  icon: 36,
  touch: 44,
};

export const typography = {
  fontFamily: Platform.select({
    ios: "System",
    android: "sans",
    default: "system-ui",
  }),
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "400" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
};

export const shadows = StyleSheet.create({
  floating: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === "android" ? 6 : 0,
  },
  control: {
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: Platform.OS === "android" ? 1 : 0,
  },
});
