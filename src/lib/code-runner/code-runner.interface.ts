export type LogEntry = {
  type: "log" | "error" | (string & {});
  args: ({ type: "data"; value: any } | { type: "image"; value: string })[];
};

export type CodeRunnerResult = {
  success: boolean;
  logs: LogEntry[];
  error?: string;
  executionTimeMs?: number;
  result?: any;
};

export type CodeRunnerOptions = {
  code: string;
  timeout?: number;
  onLog?: (entry: LogEntry) => void;
};
