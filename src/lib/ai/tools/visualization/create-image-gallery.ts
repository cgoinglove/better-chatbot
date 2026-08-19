import { tool as createTool } from "ai";
import { z } from "zod";

export const createImageGalleryTool = createTool({
  description:
    "Create an image gallery with responsive grid layouts and modal lightbox. Use for displaying collections of images like product photos, portfolios, team members, before/after comparisons, or any visual content that benefits from being viewable in detail. Users can click images to view full-size with keyboard navigation.",
  inputSchema: z.object({
    title: z
      .string()
      .describe(
        "Title for the gallery (e.g., 'Product Variations', 'Architecture Examples')",
      ),
    description: z
      .string()
      .optional()
      .describe("Optional description or context for the gallery"),
    images: z
      .array(
        z.object({
          src: z.string().describe("Image URL (must be publicly accessible)"),
          alt: z
            .string()
            .optional()
            .describe("Alt text describing the image for accessibility"),
          details: z
            .string()
            .optional()
            .describe(
              "Optional caption or details shown in the lightbox modal",
            ),
        }),
      )
      .describe("Array of images to display in the gallery"),
  }),
  execute: async () => {
    return "Success";
  },
});
