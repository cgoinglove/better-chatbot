import { tool as createTool } from "ai";
import { z } from "zod";

export const createStepsTool = createTool({
  description:
    "Create a vertical steps visualization showing sequential instructions or procedures. Use for recipes, tutorials, setup guides, workflows, or any ordered list of instructions where users need to follow steps in sequence.",
  inputSchema: z.object({
    title: z
      .string()
      .describe("Title for the steps (e.g., 'How to Deploy App')"),
    description: z
      .string()
      .optional()
      .describe("Optional description or context for the steps"),
    steps: z
      .array(
        z.object({
          title: z.string().describe("Step title or heading"),
          details: z.string().describe("Detailed instructions for this step"),
          number: z
            .number()
            .optional()
            .describe(
              "Optional custom step number (defaults to auto-numbering)",
            ),
        }),
      )
      .describe("Array of steps in sequential order"),
  }),
  execute: async () => {
    return "Success";
  },
});
