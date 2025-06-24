import { tool as createTool } from "ai";
import { z } from "zod";

export const createPieChartTool = createTool({
  description: "Create a pie chart",
  parameters: z.object({
    data: z.array(z.object({ label: z.string(), value: z.number() })),
    title: z.string(),
    description: z.string().optional(),
    unit: z.string().optional(),
  }),
  execute: async () => {
    return "Success";
  },
});
