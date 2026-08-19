import { metrics, trace } from "@opentelemetry/api";

/**
 * Shared meters, tracers and instruments for the app's business operations.
 *
 * Instruments are created once at module scope. Every dimension used here is a
 * code-defined constant or an opaque enum-like value (outcome, channel, error
 * class) — never a user ID, org ID, or free-text string, which would blow up
 * metric cardinality. Those belong on spans, not on metric attributes.
 */
const meter = metrics.getMeter("keinsaas-navigator");

export const appTracer = trace.getTracer("keinsaas-navigator");

/** MCP tool calls by outcome — the per-server failure rate. */
export const mcpToolCalls = meter.createCounter("mcp.tool.calls", {
  description: "MCP tool call attempts, by outcome.",
});

export const mcpToolCallDuration = meter.createHistogram(
  "mcp.tool.call.duration",
  { description: "MCP tool call duration.", unit: "ms" },
);

/** MCP tool-list lookups, split by whether the versioned cache served them. */
export const mcpToolListLookups = meter.createCounter(
  "mcp.tools.list.lookups",
  {
    description: "MCP tool list lookups, by cache result and outcome.",
  },
);

/** Model routing decisions — which model was picked, and by what. */
export const aiRouteDecisions = meter.createCounter("ai.route.decisions", {
  description:
    "Model routing decisions, by resolved model and decision source.",
});

/**
 * Billing usage tracking outcomes.
 *
 * Usage events use deterministic idempotency keys, so a spike in `duplicate`
 * is normal (retries) but a spike in `failed` means usage is being dropped —
 * i.e. silently under-billing. Both are invisible today.
 */
export const billingUsageEvents = meter.createCounter("billing.usage.events", {
  description: "Billing usage tracking attempts, by outcome.",
});

/** Background job runs by outcome — async failures have no other signal. */
export const jobRuns = meter.createCounter("job.runs", {
  description: "Background (Inngest) function runs, by function and outcome.",
});

/** Inbound webhook deliveries, including signature-verification rejections. */
export const webhookDeliveries = meter.createCounter("webhook.deliveries", {
  description: "Inbound webhook deliveries, by source and outcome.",
});

/**
 * E2B sandbox running time, from the lifecycle webhook.
 *
 * E2B bills per second of running time, so this is the cost signal. Before
 * this existed the only way to answer "what does a preview actually cost us"
 * was the E2B dashboard, which cannot be split by template or correlated with
 * a deploy. Attributed by template and event type only — never sandbox ID,
 * which would be unbounded cardinality.
 */
export const e2bSandboxRuntime = meter.createHistogram("e2b.sandbox.runtime", {
  description: "E2B sandbox running time per execution interval.",
  unit: "ms",
});

/**
 * vCPU-seconds per interval — the term that dominates the E2B bill, and the
 * one that actually moves when sandboxes are paused earlier.
 */
export const e2bSandboxVcpuSeconds = meter.createHistogram(
  "e2b.sandbox.vcpu_seconds",
  { description: "E2B vCPU-seconds consumed per execution interval." },
);
