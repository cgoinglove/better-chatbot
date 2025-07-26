import { tool as createTool } from "ai";
import { z } from "zod";

const parameters = z.object({
  steps: z
    .array(
      z.object({
        thought: z
          .string()
          .describe("Your current thinking step")
          .default("Hmm, let's see... 🤔"),
        nextThoughtNeeded: z
          .boolean()
          .optional()
          .describe("Whether another thought step is needed"),
      }),
    )
    .describe(
      "Sequence of thinking steps that form your reasoning process. Include all steps from initial analysis to final conclusion.",
    )
    .default([
      {
        nextThoughtNeeded: false,
        thought: "Hmm, let's see... 🤔",
      },
    ]),
});

export type ThoughtData = z.infer<typeof parameters>["steps"][number];

export const sequentialThinkingTool = createTool({
  description: `A tool for step-by-step problem-solving through a sequence of thinking steps.
This tool helps analyze problems through a simple thinking process.

**Important Guideline for Tool Usage:**
If you determine that the user's query requires using any tools (like codebase_search, read_file, edit_file, etc.), ALWAYS use this sequentialThinking tool FIRST to plan your approach. In your thinking steps, clearly outline:
- What tools are needed
- Why each tool is necessary
- How you plan to use them (including specific queries/parameters)
This structured planning will be visible to the user, helping them understand your reasoning process and building trust.

When to use this tool:
- Breaking down complex problems into multiple reasoning steps
- Analysis that requires multiple connected steps
- Problems that need step-by-step solution development
- Planning the use of other tools before executing them

How to use:
- Provide a complete sequence of all thinking steps in the 'steps' array
- Each step should build on previous understanding
- Set 'nextThoughtNeeded: false' only on the final step
- Keep thinking clear, focused, and logical

**Example of Planning Tool Usage (as JSON output):** 
{
  "steps": [
    {
      "thought": "The user asked to fix a bug in the login button. First, I need to locate the relevant code.",
      "nextThoughtNeeded": true
    },
    {
      "thought": "I'll use file_search with query 'login button' to find the component file, because it allows fuzzy matching on file paths.",
      "nextThoughtNeeded": true
    },
    {
      "thought": "Once I have the file path, I'll use read_file to examine the button's click handler and identify the bug.",
      "nextThoughtNeeded": true
    },
    {
      "thought": "Finally, if needed, I'll use edit_file to apply the fix, explaining the change in the instructions.",
      "nextThoughtNeeded": false
    }
  ]
}

Parameters for each step:
- thought: Your thinking step content (analysis, reasoning, conclusion, etc.)
- nextThoughtNeeded: True if more steps needed, false for the final step`,
  parameters,
  execute: async (p) => p,
});
