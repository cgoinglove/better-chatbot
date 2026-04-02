export interface E2BExecutionImage {
  base64: string;
  format: string;
}

export interface E2BExecutionResult {
  stdout: string;
  stderr: string;
  images: E2BExecutionImage[];
  sessionId: string;
}

export interface ArtifactData {
  id: string;
  code: string;
  stdout: string;
  stderr?: string;
  images: E2BExecutionImage[];
  title: string;
  sessionId: string;
}
