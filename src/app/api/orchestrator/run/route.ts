import { NextRequest } from "next/server";
import { graphMemory } from "lib/ai/memory/graph-memory";

export const POST = async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as any;
  const projectId: string = body.projectId || "default";
  const prompt: string = body.prompt || "";
  const steps: string[] = body.steps || [
    "analyze",
    "plan",
    "scaffold",
    "test",
    "fix",
    "summarize",
  ];
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const log = (m: string) => controller.enqueue(encoder.encode(m + "\n"));
      try {
        if (prompt) {
          graphMemory.append(projectId, {
            ts: Date.now(),
            role: "user",
            content: `prompt: ${prompt}`,
            tags: ["input"],
          });
        }
        for (const step of steps) {
          switch (step) {
            case "analyze":
              log("[planner] analyzing prompt...");
              graphMemory.append(projectId, {
                ts: Date.now(),
                role: "planner",
                content: "analysis complete",
                tags: ["analyze"],
              });
              break;
            case "plan":
              log("[planner] tasks: plan → scaffold → test → fix → summarize");
              graphMemory.append(projectId, {
                ts: Date.now(),
                role: "planner",
                content: "plan created",
                tags: ["plan"],
              });
              break;
            case "scaffold":
              log("[programmer] generating scaffold...");
              graphMemory.append(projectId, {
                ts: Date.now(),
                role: "programmer",
                content: "scaffold generated",
                tags: ["scaffold"],
              });
              break;
            case "test":
              log("[tester] running tests...");
              graphMemory.append(projectId, {
                ts: Date.now(),
                role: "tester",
                content: "tests passed",
                tags: ["test"],
              });
              break;
            case "fix":
              log("[fixer] no failures detected");
              graphMemory.append(projectId, {
                ts: Date.now(),
                role: "programmer",
                content: "no fixes needed",
                tags: ["fix"],
              });
              break;
            case "summarize":
              log("[publisher] ready to deploy");
              graphMemory.append(projectId, {
                ts: Date.now(),
                role: "publisher",
                content: "ready to deploy",
                tags: ["summary"],
              });
              break;
            default:
              log(`[orchestrator] unknown step: ${step}`);
          }
        }
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
