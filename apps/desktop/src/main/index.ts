import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, app, shell } from "electron";
import {
  initAutoUpdater,
  registerUpdateIpcHandlers,
  setUpdateMainWindow,
} from "./auto-updater.js";
import { resolveAppIconPath } from "./icon.js";
import { registerIpcHandlers } from "./ipc-handlers.js";
import { registerMcpIpcHandlers } from "./mcp-ipc.js";
import { createApplicationMenu } from "./menu.js";
import {
  registerNotificationHandlers,
  setNotificationMainWindow,
} from "./notification-ipc.js";
import {
  initDesktopTelemetry,
  recordDesktopError,
  shutdownDesktopTelemetry,
} from "./otel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appIconPath = resolveAppIconPath();

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

function resolveWebUrl(): string {
  if (isDev) {
    const port = process.env.PORT || "3000";
    return `http://localhost:${port}`;
  }
  if (process.env.KEINSAAS_WEB_URL) {
    return process.env.KEINSAAS_WEB_URL;
  }
  return "https://app.keinsaas.com";
}

const ALLOWED_EXTERNAL_HOSTS = new Set([
  "apps.apple.com",
  "app.keinsaas.com",
  "www.keinsaas.com",
  "keinsaas.com",
]);

function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "mailto:") return true;
    return ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Identity providers the web app can hand off to (`lib/auth/config.ts` wires
 * Google, GitHub and Microsoft). These must navigate *inside* the app window:
 * the OAuth callback redirects back to the app origin and sets the Better Auth
 * session cookie there. Sent to the system browser via `shell.openExternal`,
 * that cookie would land in the user's default browser and never reach the
 * Electron session — sign-in would appear to succeed and leave them logged out.
 *
 * Kept separate from ALLOWED_EXTERNAL_HOSTS, which is for links that genuinely
 * belong in the system browser and must stay narrow.
 */
const OAUTH_HOSTS = new Set([
  "accounts.google.com",
  "github.com",
  "login.microsoftonline.com",
]);

function isOAuthUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return OAUTH_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

async function createMainWindow(): Promise<BrowserWindow> {
  const preloadPath = path.join(__dirname, "../preload/index.js");
  const webUrl = resolveWebUrl();

  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "Keinsaas Navigator",
    ...(appIconPath ? { icon: appIconPath } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    // Providers that open the consent screen in a popup keep it in-app, so the
    // callback lands in this session rather than the system browser.
    if (isOAuthUrl(url)) {
      return { action: "allow" };
    }
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    const target = new URL(url);
    const origin = new URL(webUrl).origin;
    if (target.origin !== origin) {
      // Let the OAuth handshake run in-window. Blocking it here is what made
      // "Sign in with Google" silently do nothing in the desktop app.
      if (isOAuthUrl(url)) return;
      event.preventDefault();
      if (isAllowedExternalUrl(url)) {
        void shell.openExternal(url);
      }
    }
  });

  if (isDev) {
    window.webContents.on("console-message", (_event, _level, message) => {
      console.log(`[renderer] ${message}`);
    });
  }

  try {
    await window.loadURL(webUrl);
  } catch (error) {
    console.error(`Failed to load ${webUrl}:`, error);
    throw error;
  }

  if (isDev) {
    const bridge = await window.webContents.executeJavaScript(
      `window.desktop?.platform ?? "missing"`,
      true,
    );
    console.log(`[desktop] preload bridge platform=${bridge}`);
  }

  return window;
}

async function bootstrap(): Promise<void> {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.keinsaas.navigator");
  }

  registerIpcHandlers();
  registerMcpIpcHandlers();
  registerNotificationHandlers();
  registerUpdateIpcHandlers();
  createApplicationMenu();
  let mainWindow: BrowserWindow | null = null;
  try {
    mainWindow = await createMainWindow();
    setNotificationMainWindow(mainWindow);
    setUpdateMainWindow(mainWindow);
    mainWindow.on("closed", () => {
      mainWindow = null;
      setNotificationMainWindow(null);
      setUpdateMainWindow(null);
    });
    initAutoUpdater();
  } catch (error) {
    console.error("Desktop startup failed:", error);
    recordDesktopError("desktop.bootstrap", error);
    // Flush before exiting, otherwise the batch containing the very error that
    // killed startup is dropped.
    void shutdownDesktopTelemetry().finally(() => app.exit(1));
  }
}

app.whenReady().then(() => {
  // Off unless KEINSAAS_DESKTOP_TELEMETRY=1 — see ./otel.ts.
  initDesktopTelemetry(app.getVersion());
  void bootstrap();
});

app.on("before-quit", () => {
  void shutdownDesktopTelemetry();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow();
  }
});
