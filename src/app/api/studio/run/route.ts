import { NextRequest } from "next/server";
export const runtime = "nodejs";
import { getSession } from "auth/server";
import { getWorkspacePath } from "lib/studio/workspace";
import { spawn } from "node:child_process";

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const {
    image = "node:20-alpine",
    cmd = "sh",
    args = ["-lc", "npm -v"],
    workdir = "/workspace",
  } = await req.json();
  const base = getWorkspacePath(session.user.id);

  const dockerArgs = [
    "run",
    "--rm",
    "-v",
    `${base}:${workdir}`,
    "-w",
    workdir,
    image,
    cmd,
    ...args,
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const child = spawn("docker", dockerArgs, { env: process.env });
      const onData = (b: Buffer) =>
        controller.enqueue(encoder.encode(b.toString()));
      child.stdout.on("data", onData);
      child.stderr.on("data", onData);
      child.on("close", (code) => {
        controller.enqueue(encoder.encode(`\n[exit ${code}]`));
        controller.close();
      });
      child.on("error", (e) => {
        controller.enqueue(encoder.encode(`[error] ${e.message}`));
        controller.close();
      });
      req.signal.addEventListener("abort", () => {
        try {
          child.kill("SIGTERM");
        } catch {}
        controller.close();
      });
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain" } });
};
