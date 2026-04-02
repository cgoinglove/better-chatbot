import { tool } from "ai";
import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import { getOrCreateSession, refreshSession } from "lib/e2b/session-manager";
import type { E2BExecutionResult } from "lib/e2b/types";

export function createExecutePythonTool(threadId: string) {
  return tool({
    description:
      "Execute Python code in a persistent server-side sandbox. Use for data analysis, Excel/CSV file processing, and chart generation. Files uploaded via fileUrl are available at /home/user/{fileName}. Variables and imports persist across messages in this conversation.",
    parameters: z.object({
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
    }): Promise<E2BExecutionResult> => {
      const sandboxId = await getOrCreateSession(threadId);
      const sandbox = await Sandbox.connect(sandboxId, {
        apiKey: process.env.E2B_API_KEY!,
      });

      if (fileUrl && fileName) {
        const response = await fetch(fileUrl);
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

      return { stdout, stderr, images, sessionId: sandbox.sandboxId };
    },
  });
}
