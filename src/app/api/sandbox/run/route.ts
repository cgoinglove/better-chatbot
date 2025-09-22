import { NextRequest } from "next/server";
import { spawn } from "node:child_process";

export const POST = async (req: NextRequest) => {
  const {
    image,
    cmd,
    args = [],
    workdir,
    env = {},
    mounts = [],
  } = await req.json();
  if (!image || !cmd)
    return Response.json({ error: "image and cmd required" }, { status: 400 });

  const dockerArgs: string[] = [
    "run",
    "--rm",
    "--network",
    "none",
    "--cpus",
    "1",
    "--memory",
    "1g",
  ];

  if (workdir) dockerArgs.push("-w", workdir);
  Object.entries(env as Record<string, string>).forEach(([k, v]) => {
    if (v && typeof v === "string") dockerArgs.push("-e", `${k}=${v}`);
  });
  (mounts as { host: string; target: string; readonly?: boolean }[]).forEach(
    (m) => {
      const ro = m.readonly ? ":ro" : "";
      dockerArgs.push("-v", `${m.host}:${m.target}${ro}`);
    },
  );

  dockerArgs.push(image, cmd, ...args);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        const child = spawn("docker", dockerArgs, { env: process.env });
        const onData = (chunk: Buffer) =>
          controller.enqueue(encoder.encode(chunk.toString()));
        child.stdout.on("data", onData);
        child.stderr.on("data", onData);
        child.on("close", (code) => {
          controller.enqueue(encoder.encode(`\n[exit ${code}]`));
          controller.close();
        });
        child.on("error", (err) => {
          controller.enqueue(encoder.encode(`[error] ${err.message}`));
          controller.close();
        });
        req.signal.addEventListener("abort", () => {
          try {
            child.kill("SIGTERM");
          } catch {}
          controller.close();
        });
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(`[error] ${e?.message || "unknown"}`),
        );
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
