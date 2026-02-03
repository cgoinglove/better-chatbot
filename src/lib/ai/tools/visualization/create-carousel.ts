import { tool as createTool } from "ai";
import { z } from "zod";

export const createCarouselTool = createTool({
  description:
    "Create a horizontal scrolling carousel for displaying multiple items side-by-side. Supports markdown formatting including images, links, and text formatting. Use for product showcases, feature highlights, testimonials, pricing tiers, or any content where users benefit from browsing items horizontally with smooth scrolling and navigation buttons.",
  inputSchema: z.object({
    title: z
      .string()
      .describe(
        "Title for the carousel (e.g., 'Featured Products', 'Customer Reviews')",
      ),
    description: z
      .string()
      .optional()
      .describe("Optional description or context for the carousel"),
    items: z
      .array(
        z.object({
          content: z
            .string()
            .describe(
              "Content for this carousel item. Supports markdown including images (![alt](url)), links ([text](url)), bold, italic, etc.",
            ),
          id: z
            .string()
            .optional()
            .describe("Optional unique identifier for the item"),
        }),
      )
      .describe("Array of items to display in the carousel"),
    itemsToScroll: z
      .number()
      .optional()
      .describe(
        "Optional: how many items to scroll when clicking prev/next buttons (defaults to 1)",
      ),
  }),
  execute: async () => {
    return "Success";
  },
});
