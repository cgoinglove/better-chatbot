import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  // read body for future use
  await req.json().catch(() => ({}));
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const log = (m: string) => controller.enqueue(encoder.encode(m + "\n"));
      try {
        log("[planner] analyzing prompt...");
        log("[planner] tasks: plan → scaffold → test → fix → summarize");
        log("[programmer] generating scaffold...");
        log("[tester] running tests...");
        log("[fixer] no failures detected (placeholder)");
        log("[publisher] ready to deploy");
        controller.close();
      } catch (e: any) {
        log(`[error] ${e?.message || "unknown"}`);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
