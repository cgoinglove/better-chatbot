export type LogEntry = {
  type: "log" | "error" | (string & {});
  args: ({ type: "data"; value: any } | { type: "image"; value: string })[];
};

export type E2BArtifact = {
  filename: string;
  mimeType?: string;
  url?: string;
  contentBase64?: string;
};

export type CodeRunnerResult = {
  success: boolean;
  logs: LogEntry[];
  error?: string;
  executionTimeMs?: number;
  result?: any;
  artifacts?: E2BArtifact[];
  sbxId?: string;
  /** Which backend actually ran the code, so the UI can label it truthfully. */
  backend?: "e2b" | "local";
  /** Attachment filenames staged into the sandbox working directory. */
  stagedFiles?: string[];
};

export type CodeRunnerOptions = {
  code: string;
  timeout?: number;
  onLog?: (entry: LogEntry) => void;
  /**
   * Thread whose attachments should be staged into the sandbox before the code
   * runs. Only used by the E2B backend; the browser worker ignores it.
   */
  threadId?: string;
};

export type CodeWorkerRequest = {
  code: string;
  type: "javascript" | "python";
  timeout?: number;
  id: string;
};

export type CodeWorkerEvent = {
  id: string;
  type: "log";
  entry: LogEntry;
};
export type CodeWorkerResult = {
  id: string;
  type: "result";
  result: CodeRunnerResult;
};

export type CodeWorkerResponse = CodeWorkerEvent | CodeWorkerResult;
