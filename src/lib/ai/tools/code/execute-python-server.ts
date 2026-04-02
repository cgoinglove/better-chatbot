import { tool } from "ai";
import path from "node:path";
import { z } from "zod";
import { put } from "@vercel/blob";
import { Sandbox } from "@e2b/code-interpreter";
import { getOrCreateSession, refreshSession } from "lib/e2b/session-manager";
import type { E2BExecutionResult } from "lib/e2b/types";

export function createExecutePythonTool(threadId: string) {
  return tool({
    description:
      "Execute Python code in a persistent server-side sandbox. Use for data analysis, Excel/CSV file processing, chart generation, and file creation (PPTX, DOCX, PDF, XLSX). Files uploaded via fileUrl are available at /home/user/{fileName}. Variables and imports persist across messages in this conversation.",
    inputSchema: z.object({
      code: z.string().describe("Python code to execute"),
      fileUrl: z
        .string()
        .optional()
        .describe("Vercel Blob URL of a file to load into the sandbox"),
      fileName: z
        .string()
        .optional()
        .describe("Filename to use inside the sandbox (e.g. sales.xlsx)"),
    }),
    execute: async ({
      code,
      fileUrl,
      fileName,
    }): Promise<
      E2BExecutionResult & { downloadUrl?: string; downloadFilename?: string }
    > => {
      const sandboxId = await getOrCreateSession(threadId);
      const apiKey = process.env.E2B_API_KEY;
      if (!apiKey)
        throw new Error("E2B_API_KEY environment variable is not set");
      const sandbox = await Sandbox.connect(sandboxId, { apiKey });

      if (fileUrl && fileName) {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch file from ${fileUrl}: ${response.status} ${response.statusText}`,
          );
        }
        const buffer = await response.arrayBuffer();
        await sandbox.files.write(`/home/user/${fileName}`, buffer);
      }

      const execution = await sandbox.runCode(code);

      await refreshSession(threadId, sandbox.sandboxId);

      const stdout = execution.logs.stdout.join("");
      const stderr = execution.logs.stderr.join("");
      const images = execution.results
        .filter((r) => r.png)
        .map((r) => ({ base64: r.png!, format: "png" }));

      // Detect DOWNLOAD_FILE marker and upload to Vercel Blob
      const downloadMatch = stdout.match(/DOWNLOAD_FILE:([^\n\r]+)/);
      let downloadUrl: string | undefined;
      let downloadFilename: string | undefined;

      if (downloadMatch) {
        const sandboxPath = downloadMatch[1].trim();
        downloadFilename = path.basename(sandboxPath);
        try {
          const fileBytes = await sandbox.files.read(sandboxPath);
          const blobResult = await put(
            `exports/${Date.now()}-${downloadFilename}`,
            Buffer.from(fileBytes as unknown as ArrayBuffer),
            { access: "public" },
          );
          downloadUrl = blobResult.url;
        } catch {
          // Non-fatal — analysis result still returned without download
        }
      }

      return {
        stdout,
        stderr,
        images,
        sessionId: sandbox.sandboxId,
        ...(downloadUrl ? { downloadUrl, downloadFilename } : {}),
      };
    },
  });
}
