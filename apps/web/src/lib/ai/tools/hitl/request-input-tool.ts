import { tool } from "ai";
import { z } from "zod";

/**
 * HITL Tool: Request Input
 *
 * This tool blocks execution to collect user input.
 * Following the AI SDK 6 client-side pattern:
 * - NO needsApproval (UI controls submission)
 * - NO execute function (UI injects user's input via addToolResult)
 *
 * Flow:
 * 1. AI realizes it needs user input (e.g., API key, preference)
 * 2. AI calls this tool with a question
 * 3. Tool has no execute → AI SDK waits for result
 * 4. UI shows input form (state='input-available')
 * 5. User enters value and submits
 * 6. UI calls addToolResult with user's input
 * 7. AI receives the value and continues
 */
export const requestInputTool = tool({
  description:
    "Request specific input from the user when you need information only they can provide. Blocks execution until user submits their response.",
  inputSchema: z.object({
    label: z
      .string()
      .describe(
        "Clear question or prompt asking the user what information you need",
      ),
    placeholder: z
      .string()
      .describe("Example or hint text to guide the user's input"),
    inputType: z
      .enum(["text", "password", "number", "email", "url"])
      .optional()
      .default("text")
      .describe("Type of input expected"),
  }),
  // NO needsApproval - UI controls the submission flow
  // NO execute - UI injects user's input via addToolResult()
});
