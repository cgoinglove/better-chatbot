import { tool as createTool } from "ai";
import { z } from "zod";

const parameters = z.object({
  steps: z
    .array(
      z.object({
        thought: z.string().describe("Your current thinking step"),
        nextThoughtNeeded: z
          .boolean()
          .describe("Whether another thought step is needed"),
        thoughtNumber: z
          .number()
          .int()
          .min(1)
          .describe("Current thought number"),
        totalThoughts: z
          .number()
          .int()
          .min(1)
          .describe("Estimated total thoughts needed"),
        isRevision: z
          .boolean()
          .optional()
          .describe("Whether this revises previous thinking"),
        revisesThought: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Which thought is being reconsidered"),
        branchFromThought: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Branching point thought number"),
        branchId: z.string().optional().describe("Branch identifier"),
        needsMoreThoughts: z
          .boolean()
          .optional()
          .describe("If more thoughts are needed"),
      }),
    )
    .describe(
      "Complete sequence of thinking steps that form your reasoning process. Include all steps from initial analysis to final conclusion.",
    )
    .default([
      {
        nextThoughtNeeded: false,
        thoughtNumber: 1,
        totalThoughts: 1,
        thought: "Hmm, let's see... 🤔",
      },
    ]),
});

export type ThoughtData = z.infer<typeof parameters>["steps"][number];

export const sequentialThinkingTool = createTool({
  description: `A comprehensive tool for dynamic and reflective problem-solving through a complete sequence of thinking steps.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into multiple reasoning steps
- Planning and design with room for revision and iteration
- Analysis that might need course correction or alternative approaches
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution with connected reasoning
- Tasks that need to maintain context and build upon previous steps
- Situations where irrelevant information needs to be filtered out

Key features:
- Provide a complete sequence of all thinking steps in one response
- You can adjust total_thoughts up or down as your understanding evolves
- You can question or revise previous thoughts within the sequence
- You can express uncertainty and explore alternative approaches
- Thoughts don't need to build linearly - you can branch or backtrack
- Generate solution hypotheses and verify them through reasoning
- Continue until you reach a satisfactory conclusion

How to structure your thinking sequence:
- Start with initial analysis and problem understanding
- Include hypothesis generation and testing steps
- Add revision steps when reconsidering previous thoughts
- Use branching for exploring alternative approaches
- End with a clear conclusion or final answer

Parameters for each step:
- thought: Your thinking step content (analysis, hypothesis, revision, conclusion, etc.)
- next_thought_needed: True if more steps needed, false for the final step
- thought_number: Current step number in sequence
- total_thoughts: Current estimate of total steps needed (adjust as you progress)
- is_revision: Mark true when revising or reconsidering previous thinking
- revises_thought: If revising, specify which step number is being reconsidered
- branch_from_thought: If branching to explore alternatives, specify the branching point
- branch_id: Identifier for the current branch (if exploring multiple paths)
- needs_more_thoughts: Use when realizing more steps are needed than initially estimated

Guidelines for creating the sequence:
1. Plan your complete reasoning process from start to finish
2. Include all necessary steps for thorough analysis
3. Feel free to revise or question earlier steps within the same sequence
4. Express uncertainty when present and explore alternatives
5. Mark revision and branching steps appropriately
6. Ignore irrelevant information and focus on the core problem
7. Generate and verify hypotheses as part of your reasoning
8. Ensure the final step provides a clear, well-reasoned conclusion
9. Only mark the last step as next_thought_needed: false when truly complete`,
  parameters,
  execute: async (p) => p,
});
