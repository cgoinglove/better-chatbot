import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type BrowserWindow, app, ipcMain } from "electron";
import type { AppUpdater, ProgressInfo, UpdateInfo } from "electron-updater";

export type DesktopUpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; version: string }
  | { status: "not-available" }
  | { status: "downloading"; version: string; percent: number }
  | { status: "downloaded"; version: string }
  | { status: "error"; message: string };

const UPDATE_STATE_CHANGED_CHANNEL = "updates:state-changed";
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

let updateState: DesktopUpdateState = { status: "idle" };
let mainWindow: BrowserWindow | null = null;
let autoUpdaterRef: AppUpdater | null = null;

function setState(next: DesktopUpdateState): void {
  updateState = next;
  mainWindow?.webContents.send(UPDATE_STATE_CHANGED_CHANNEL, updateState);
}

export function setUpdateMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

/**
 * Resolves the update feed, or null when this build has none.
 *
 * `DESKTOP_UPDATE_FEED_URL` wins at runtime; otherwise the feed baked in by
 * electron-builder at package time is used. Builds packaged without the env
 * var carry an empty publish URL, which is how community builds ship with
 * auto-update switched off.
 */
function resolveUpdateFeedUrl(): string | null {
  const fromEnv = process.env.DESKTOP_UPDATE_FEED_URL?.trim();
  if (fromEnv) return fromEnv;

  try {
    const packagedConfig = join(process.resourcesPath, "app-update.yml");
    if (!existsSync(packagedConfig)) return null;
    const url = readFileSync(packagedConfig, "utf8").match(
      /^\s*url:\s*(\S+)\s*$/m,
    )?.[1];
    return url && url !== '""' && url !== "''" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Auto-update wiring — feed resolved by `resolveUpdateFeedUrl()`. No-op in
 * development and in builds without an update feed. Downloads only start once
 * the user acts on the "update available" notice in the web UI; the
 * install then happens automatically once the download completes.
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged) return;

  const feedUrl = resolveUpdateFeedUrl();
  if (!feedUrl) return;

  void import("electron-updater")
    .then(({ autoUpdater }) => {
      autoUpdaterRef = autoUpdater;
      autoUpdater.setFeedURL({ provider: "generic", url: feedUrl });
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;

      autoUpdater.on("checking-for-update", () => {
        setState({ status: "checking" });
      });

      autoUpdater.on("update-available", (info: UpdateInfo) => {
        setState({ status: "available", version: info.version });
      });

      autoUpdater.on("update-not-available", () => {
        setState({ status: "not-available" });
      });

      autoUpdater.on("download-progress", (progress: ProgressInfo) => {
        if (updateState.status !== "downloading") return;
        setState({ ...updateState, percent: progress.percent });
      });

      autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
        setState({ status: "downloaded", version: info.version });
        autoUpdater.quitAndInstall(false, true);
      });

      autoUpdater.on("error", (error: Error) => {
        setState({ status: "error", message: error.message });
      });

      const check = () => {
        autoUpdater.checkForUpdates().catch(() => {
          // Non-fatal: errors are also surfaced via the "error" event above.
        });
      };
      check();
      setInterval(check, CHECK_INTERVAL_MS);
    })
    .catch(() => {
      // electron-updater unavailable in some dev installs.
    });
}

export function registerUpdateIpcHandlers(): void {
  ipcMain.handle("updates:get-state", () => updateState);

  ipcMain.handle("updates:download-and-install", async () => {
    if (!autoUpdaterRef || updateState.status !== "available") return;
    const version = updateState.version;
    try {
      setState({ status: "downloading", version, percent: 0 });
      await autoUpdaterRef.downloadUpdate();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
