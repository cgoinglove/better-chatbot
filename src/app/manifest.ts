import type { MetadataRoute } from "next";

const APP_NAME = "Better Chatbot";
const APP_SHORT_NAME = "Better Chatbot";
const APP_DESCRIPTION =
  "Just a Better Chatbot. Powered by Agent & MCP & Workflows.";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",

    icons: [
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },

      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/icon-192x192.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "192x192",
        src: "/icons/icon-maskable-192x192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/icon-512x512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/icon-maskable-512x512.png",
        type: "image/png",
      },
    ],
  };
}
