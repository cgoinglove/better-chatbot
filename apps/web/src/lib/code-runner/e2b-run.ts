import { randomUUID } from "node:crypto";
import type { Sandbox } from "@e2b/code-interpreter";
import { collectGeneratedFiles, snapshotWorkdir } from "lib/e2b/artifact-files";
import {
  EXEC_SANDBOX_TIMEOUT_MS,
  type SandboxBillingContext,
  createSandbox,
  errorLabel,
  toSandboxErrorResponse,
} from "lib/e2b/create-sandbox";
import { serverFileStorage } from "lib/file-storage";
import logger from "lib/logger";
import type {
  CodeRunnerResult,
  E2BArtifact,
  LogEntry,
} from "./code-runner.interface";

const DEFAULT_EXECUTION_TIMEOUT_MS = 30_000;

/**
 * Upload each base64 artifact to durable storage and swap in a permanent URL,
 * so downloads survive a page refresh (the client only holds base64 in memory
 * and strips it before persistence). Best-effort per file — on upload failure
 * the base64 is kept as a fallback.
 *
 * Artifacts go to the private attachments bucket and are served through the
 * authenticated `/api/storage/download` route: bucket public URLs and signed
 * URLs both break after persistence (private bucket / 1h expiry), while the
 * app route stays valid for as long as the object exists.
 */
export async function persistArtifacts(
  artifacts: E2BArtifact[],
  userId?: string,
): Promise<E2BArtifact[]> {
  return Promise.all(
    artifacts.map(async (artifact) => {
      if (!artifact.contentBase64) return artifact;
      try {
        const { key } = await serverFileStorage.upload(
          Buffer.from(artifact.contentBase64, "base64"),
          {
            contentType: artifact.mimeType,
            filename: artifact.filename,
            userId,
            uploadType: "attachment",
          },
        );
        // Durable URL obtained — drop the base64 payload.
        return {
          filename: artifact.filename,
          mimeType: artifact.mimeType,
          url: `/api/storage/download?key=${encodeURIComponent(key)}`,
        };
      } catch (err) {
        logger.warn(
          `[e2b] artifact upload failed file=${artifact.filename} error=${errorLabel(err)}`,
        );
        return artifact;
      }
    }),
  );
}

export type E2BRunResult = CodeRunnerResult & {
  artifacts?: E2BArtifact[];
  sbxId?: string;
};

/** A file to write into the sandbox working directory before the code runs. */
export type E2BStagedFile = { filename: string; bytes: Buffer };

/** Working directory the interpreter template runs in; also where files land. */
const SANDBOX_WORKDIR = "/home/user";

export async function e2bRun(
  code: string,
  type: "javascript" | "python",
  billing: SandboxBillingContext,
  timeout = DEFAULT_EXECUTION_TIMEOUT_MS,
  files: E2BStagedFile[] = [],
): Promise<E2BRunResult> {
  const startTime = Date.now();
  const logs: LogEntry[] = [];

  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      logs: [],
      error: "E2B_API_KEY is not configured",
      backend: "e2b",
    };
  }

  let sbx: Sandbox;
  try {
    sbx = await createSandbox("code-interpreter-v1", {
      apiKey,
      timeoutMs: EXEC_SANDBOX_TIMEOUT_MS,
      billing,
      requestId: randomUUID(),
    });
  } catch (err) {
    logger.error(`[e2b] exec sandbox create failed error=${errorLabel(err)}`);
    return {
      success: false,
      logs: [],
      error: toSandboxErrorResponse(err, "code-interpreter-v1").message,
      backend: "e2b",
    };
  }

  const stagedFiles = await stageFiles(sbx, files, logs);

  try {
    // Snapshot the working directory so files written by the code (PDFs,
    // CSVs, images, …) can be detected and returned as artifacts. Taken after
    // staging so pre-loaded attachments are not misreported as generated.
    const workdirBefore = await snapshotWorkdir(sbx);

    const {
      logs: execLogs,
      error,
      results,
    } = await sbx.runCode(code, {
      language: type === "javascript" ? "js" : "python",
      timeoutMs: timeout,
    });

    for (const line of execLogs.stdout) {
      logs.push({ type: "log", args: [{ type: "data", value: line }] });
    }
    for (const line of execLogs.stderr) {
      logs.push({ type: "error", args: [{ type: "data", value: line }] });
    }

    const artifacts: E2BArtifact[] = [];
    for (const result of results) {
      if (result.png) {
        const dataUri = `data:image/png;base64,${result.png}`;
        logs.push({
          type: "log",
          args: [{ type: "image", value: dataUri }],
        });
        artifacts.push({
          filename: "output.png",
          mimeType: "image/png",
          contentBase64: result.png,
        });
      }
      if (result.text) {
        logs.push({
          type: "log",
          args: [{ type: "data", value: result.text }],
        });
      }
      if (result.html) {
        artifacts.push({
          filename: "output.html",
          mimeType: "text/html",
          contentBase64: Buffer.from(result.html).toString("base64"),
        });
      }
      if (result.pdf) {
        artifacts.push({
          filename: "output.pdf",
          mimeType: "application/pdf",
          contentBase64: result.pdf,
        });
      }
    }

    // Files written to the working directory (e.g. doc.output('report.pdf'),
    // df.to_csv('data.csv'), plt.savefig('chart.pdf')) become artifacts too.
    const generatedFiles = await collectGeneratedFiles(sbx, workdirBefore);
    for (const file of generatedFiles) {
      artifacts.push(file);
      logs.push({
        type: "log",
        args: [
          {
            type: "data",
            value: `Generated file: ${file.filename} (${file.mimeType})`,
          },
        ],
      });
    }

    // Upload artifacts to durable storage so their download links persist.
    const durableArtifacts =
      artifacts.length > 0
        ? await persistArtifacts(artifacts, billing.userId)
        : [];

    return {
      success: !error,
      logs,
      error: error ? `${error.name}: ${error.value}` : undefined,
      executionTimeMs: Date.now() - startTime,
      artifacts: durableArtifacts.length > 0 ? durableArtifacts : undefined,
      sbxId: sbx.sandboxId,
      backend: "e2b",
      stagedFiles: stagedFiles.length > 0 ? stagedFiles : undefined,
    };
  } catch (err) {
    logger.error(`[e2b] exec sandbox run failed error=${errorLabel(err)}`);
    return {
      success: false,
      logs,
      error: errorLabel(err),
      executionTimeMs: Date.now() - startTime,
      sbxId: sbx.sandboxId,
      backend: "e2b",
      stagedFiles: stagedFiles.length > 0 ? stagedFiles : undefined,
    };
  } finally {
    await sbx.kill().catch(() => {});
  }
}

/**
 * Write staged attachments into the sandbox working directory before the user
 * code runs, so `pd.read_csv('data.csv')` finds the file the user uploaded.
 * Best-effort: a file that fails to write is logged and skipped rather than
 * aborting the run. Returns the filenames that were written and records a
 * diagnostic log line in the tool result.
 */
export async function stageFiles(
  sbx: Sandbox,
  files: E2BStagedFile[],
  logs: LogEntry[],
): Promise<string[]> {
  const staged: string[] = [];
  for (const file of files) {
    try {
      // The SDK accepts ArrayBuffer, not a Node Buffer/Uint8Array view — copy
      // into a standalone ArrayBuffer so no unrelated pool memory is exposed.
      const bytes = new Uint8Array(file.bytes.byteLength);
      bytes.set(file.bytes);
      await sbx.files.write(
        `${SANDBOX_WORKDIR}/${file.filename}`,
        bytes.buffer,
      );
      staged.push(file.filename);
    } catch (err) {
      logger.warn(
        `[e2b] stage attachment write failed file=${file.filename} error=${errorLabel(err)}`,
      );
    }
  }
  if (staged.length > 0) {
    logs.push({
      type: "log",
      args: [
        {
          type: "data",
          value: `Staged attachment${staged.length > 1 ? "s" : ""} in ${SANDBOX_WORKDIR}: ${staged.join(", ")}`,
        },
      ],
    });
  }
  return staged;
}
