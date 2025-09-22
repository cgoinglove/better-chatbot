import { telemetryStore } from "lib/telemetry/store";

export const GET = async () => {
  return Response.json({
    events: telemetryStore.list(),
    summary: telemetryStore.summary(),
  });
};

export const POST = async (req: Request) => {
  const body = await req.json();
  telemetryStore.add({
    ts: Date.now(),
    type: String(body.type || "event"),
    projectId: body.projectId,
    costUsd: Number(body.costUsd || 0),
    meta: body.meta,
  });
  return Response.json({ ok: true });
};
