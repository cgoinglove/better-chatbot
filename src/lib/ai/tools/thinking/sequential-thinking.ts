import { tool as createTool } from "ai";
import { z } from "zod";

const parameters = z.object({
  thought: z.string().describe("Your current thinking step"),
  nextThoughtNeeded: z
    .boolean()
    .describe("Whether another thought step is needed"),
  thoughtNumber: z.number().int().min(1).describe("Current thought number"),
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
});

export type ThoughtData = z.infer<typeof parameters>;

export interface SequentialThinkingResult {
  formattedThought: string;
  thoughtData: ThoughtData;
}

export const sequentialThinkingTool = createTool({
  description: `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer

Parameters explained:
- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
- next_thought_needed: True if you need more thinking, even if at what seemed like the end
- thought_number: Current number in sequence (can go beyond initial total if needed)
- total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (if any)
- needs_more_thoughts: If reaching end but realizing more thoughts needed

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached`,
  parameters,
  execute: async ({
    thought,
    nextThoughtNeeded,
    thoughtNumber,
    totalThoughts,
    isRevision,
    revisesThought,
    branchFromThought,
    branchId,
    needsMoreThoughts,
  }) => {
    // Format the thought for display
    let prefix = "";
    let context = "";

    if (isRevision) {
      prefix = "🔄 Revision";
      context = ` (revising thought ${revisesThought})`;
    } else if (branchFromThought) {
      prefix = "🌿 Branch";
      context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
    } else {
      prefix = "💭 Thought";
      context = "";
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
    const border = "─".repeat(Math.max(header.length, thought.length) + 4);

    const formattedThought = `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;

    const thoughtData: ThoughtData = {
      thought,
      thoughtNumber,
      totalThoughts,
      nextThoughtNeeded,
      isRevision,
      revisesThought,
      branchFromThought,
      branchId,
      needsMoreThoughts,
    };

    return {
      formattedThought,
      thoughtData,
    };
  },
});
