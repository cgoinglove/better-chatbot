

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type Mutate<T> = Partial<T> | ((prev: T) => Partial<T>);

type Override<T, R> = Omit<T, keyof R> & R;

type ValueOf<T> = T[keyof T];

type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | { [key: string]: JsonValue };

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

interface Window {
  desktop?: {
    platform: string;
    getVersion: () => Promise<{
      app: string;
      electron: string;
      node: string;
    }>;
    mcp: {
      listTools: (
        config: DesktopMcpConfig,
      ) => Promise<
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
    };
    audit?: {
      log: (event: unknown) => Promise<{ ok: boolean }>;
    };
    notifications?: {
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
    updates?: {
      getState: () => Promise<DesktopUpdateState>;
      downloadAndInstall: () => Promise<void>;
      onStateChange: (
        callback: (state: DesktopUpdateState) => void,
      ) => () => void;
    };
  };
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};




