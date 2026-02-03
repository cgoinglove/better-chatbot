import { dispatchWorkflowSchedules } from "lib/ai/workflow/workflow-scheduler";

const HEADER_SECRET_KEYS = [
  "authorization",
  "x-workflow-scheduler-secret",
  "x-cron-secret",
];

function extractSecretToken(request: Request): string | null {
  for (const headerKey of HEADER_SECRET_KEYS) {
    const headerValue = request.headers.get(headerKey);
    if (!headerValue) continue;
    if (headerKey === "authorization") {
      const [scheme, token] = headerValue.split(" ");
      if (scheme?.toLowerCase() === "bearer" && token) {
        return token;
      }
    } else if (headerValue.trim().length) {
      return headerValue.trim();
    }
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.WORKFLOW_SCHEDULER_SECRET;
  if (!secret) {
    return new Response("Scheduler secret is not configured", {
      status: 500,
    });
  }

  const providedSecret = extractSecretToken(request);
  if (providedSecret !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { limit?: number; dryRun?: boolean } = {};
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }
  }

  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.max(1, Math.min(25, Math.floor(body.limit)))
      : undefined;
  const dryRun = typeof body.dryRun === "boolean" ? body.dryRun : false;

  const result = await dispatchWorkflowSchedules({ limit, dryRun });

  return Response.json({
    ok: true,
    result,
  });
}
