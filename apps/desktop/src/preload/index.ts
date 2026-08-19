import { contextBridge, ipcRenderer } from "electron";

type DesktopMcpConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
};

type DesktopUpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; version: string }
  | { status: "not-available" }
  | { status: "downloading"; version: string; percent: number }
  | { status: "downloaded"; version: string }
  | { status: "error"; message: string };

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke("desktop:get-version"),
  mcp: {
    listTools: (config: DesktopMcpConfig) =>
      ipcRenderer.invoke("mcp:list-tools", { config }),
    callTool: (input: {
      config: DesktopMcpConfig;
      toolName: string;
      params?: Record<string, unknown>;
    }) => ipcRenderer.invoke("mcp:tool-call", input),
    spawnStdio: async (_config: unknown) => {
      throw new Error(
        "Use desktop.mcp.listTools/callTool for stdio MCP execution",
      );
    },
    killServer: async (_id: string) => {
      throw new Error("Ephemeral desktop MCP sessions close automatically");
    },
  },
  fs: {
    readFile: async (_path: string) => {
      throw new Error("Filesystem bridge is not available yet");
    },
    watchDir: async (_path: string) => {
      throw new Error("Filesystem bridge is not available yet");
    },
  },
  keychain: {
    get: async (_key: string) => {
      throw new Error("Keychain bridge is not available yet");
    },
    set: async (_key: string, _value: string) => {
      throw new Error("Keychain bridge is not available yet");
    },
  },
  audit: {
    log: (event: unknown) => ipcRenderer.invoke("audit:log", event),
  },
  notifications: {
    show: (payload: {
      kind: "complete" | "needs_approval" | "needs_input" | "error";
      threadId?: string;
      title: string;
      body: string;
      url?: string;
      onlyWhenAway?: boolean;
    }) => ipcRenderer.invoke("notifications:show", payload),
    getPermissionStatus: () =>
      ipcRenderer.invoke("notifications:get-permission") as Promise<
        NotificationPermission | "granted"
      >,
    requestPermission: () =>
      ipcRenderer.invoke("notifications:request-permission") as Promise<
        NotificationPermission | "granted"
      >,
  },
  updates: {
    getState: () =>
      ipcRenderer.invoke("updates:get-state") as Promise<DesktopUpdateState>,
    downloadAndInstall: () =>
      ipcRenderer.invoke("updates:download-and-install") as Promise<void>,
    onStateChange: (callback: (state: DesktopUpdateState) => void) => {
      const listener = (_event: unknown, state: DesktopUpdateState) =>
        callback(state);
      ipcRenderer.on("updates:state-changed", listener);
      return () => {
        ipcRenderer.removeListener("updates:state-changed", listener);
      };
    },
  },
});

declare global {
  interface Window {
    desktop?: {
      platform: NodeJS.Platform;
      getVersion: () => Promise<{
        app: string;
        electron: string;
        node: string;
      }>;
      mcp: {
        listTools: (config: DesktopMcpConfig) => Promise<
          Array<{
            name: string;
            description?: string;
            inputSchema?: unknown;
          }>
        >;
        callTool: (input: {
          config: DesktopMcpConfig;
          toolName: string;
          params?: Record<string, unknown>;
        }) => Promise<unknown>;
        spawnStdio: (config: unknown) => Promise<unknown>;
        killServer: (id: string) => Promise<void>;
      };
      fs: {
        readFile: (path: string) => Promise<unknown>;
        watchDir: (path: string) => Promise<unknown>;
      };
      keychain: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: string) => Promise<void>;
      };
      audit: {
        log: (event: unknown) => Promise<void>;
      };
      notifications: {
        show: (payload: {
          kind: "complete" | "needs_approval" | "needs_input" | "error";
          threadId?: string;
          title: string;
          body: string;
          url?: string;
          onlyWhenAway?: boolean;
        }) => Promise<void>;
        getPermissionStatus: () => Promise<NotificationPermission | "granted">;
        requestPermission: () => Promise<NotificationPermission | "granted">;
      };
      updates: {
        getState: () => Promise<DesktopUpdateState>;
        downloadAndInstall: () => Promise<void>;
        onStateChange: (
          callback: (state: DesktopUpdateState) => void,
        ) => () => void;
      };
    };
  }
}
