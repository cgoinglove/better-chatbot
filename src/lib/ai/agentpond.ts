import "server-only";

import { createVercelSpanExporter } from "@agentpond/vercel";
import {
  OpenInferenceSimpleSpanProcessor,
  isOpenInferenceSpan,
} from "@arizeai/openinference-vercel";
import { registerOTel } from "@vercel/otel";

export function registerAgentPond() {
  registerOTel({
    serviceName: "better-chatbot",
    spanProcessors: [
      new OpenInferenceSimpleSpanProcessor({
        exporter: createVercelSpanExporter(),
        spanFilter: isOpenInferenceSpan,
        reparentOrphanedSpans: true,
      }),
    ],
  });
}
