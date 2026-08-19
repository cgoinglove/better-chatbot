/**
 * OpenTelemetry bootstrap for the Next.js app.
 *
 * Called from `instrumentation.ts` **before** the Vercel/CI early return, so it
 * runs in production — the rest of `register()` is deliberately a no-op there.
 *
 * Uses `@vercel/otel` rather than a raw `NodeSDK`: `NodeSDK` breaks Next's
 * webpack build and misses the framework's own request instrumentation.
 */
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import type { LogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import type { MetricReader } from "@opentelemetry/sdk-metrics";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";
import {
  isSuperlogConfigured,
  resolveResourceAttributes,
  superlogHeaders,
  superlogSignalUrl,
} from "./superlog";

export const SERVICE_NAME = "keinsaas-navigator-web";

let registered = false;

export function registerObservability(): void {
  // `register()` can run more than once across HMR reloads in dev; registering
  // two SDKs would double-export every span.
  if (registered) return;
  registered = true;

  // Never register in the Edge runtime: `registerOTel` crashes there
  // ("Cannot read properties of undefined (reading 'attributeCountLimit')"),
  // which kills the middleware — every request 500s with
  // MIDDLEWARE_INVOCATION_FAILED. Chat, MCP, workflows and all AI Gateway
  // calls run in the Node runtime, so no meaningful telemetry is lost.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!isSuperlogConfigured()) {
    // No token yet: skip exporter setup entirely rather than POSTing to intake
    // and collecting 401s on every request.
    return;
  }

  const headers = superlogHeaders();

  // Traces use @vercel/otel's fetch-based OTLP/JSON exporter, which is the only
  // one of the three that works in both the Node and Edge runtimes.
  const traceExporter = new OTLPHttpJsonTraceExporter({
    url: superlogSignalUrl("traces"),
    headers,
  });

  // The upstream OTLP log/metric exporters resolve to a browser platform under
  // Edge bundling, which needs XMLHttpRequest/sendBeacon — neither exists in the
  // Edge runtime. Register them for the Node runtime only; that is where chat,
  // MCP, workflows and every AI Gateway call actually run.
  const isNodeRuntime = process.env.NEXT_RUNTIME === "nodejs";

  const logRecordProcessors: LogRecordProcessor[] = isNodeRuntime
    ? [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: superlogSignalUrl("logs"),
            headers,
          }),
        }),
      ]
    : [];

  const metricReaders: MetricReader[] = isNodeRuntime
    ? [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: superlogSignalUrl("metrics"),
            headers,
          }),
        }),
      ]
    : [];

  registerOTel({
    serviceName: SERVICE_NAME,
    attributes: resolveResourceAttributes(SERVICE_NAME),
    traceExporter,
    // `registerOTel` exports no logs at all unless this is passed — the most
    // common reason an install shows traces but never a single log record.
    logRecordProcessors,
    metricReaders,
  });
}
