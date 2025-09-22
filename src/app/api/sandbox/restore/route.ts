import { NextRequest } from "next/server";
export const runtime = "nodejs";
import { spawn } from "node:child_process";

export const POST = async (req: NextRequest) => {
  try {
    const { path, snapshot } = await req.json();
    if (!path || !snapshot) {
      return Response.json(
        { error: "path and snapshot required" },
        { status: 400 },
      );
    }

    const tar = spawn("tar", ["-C", path, "-xzf", "-"], {
      env: process.env,
    });
    tar.stdin.write(Buffer.from(snapshot, "base64"));
    tar.stdin.end();

    const errChunks: Buffer[] = [];
    tar.stderr.on("data", (c) => errChunks.push(Buffer.from(c)));

    const code: number = await new Promise((resolve) => {
      tar.on("close", (c) => resolve(c ?? 1));
    });

    if (code !== 0) {
      return Response.json(
        { error: Buffer.concat(errChunks).toString() || `tar exit ${code}` },
        { status: 500 },
      );
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message || "unknown" }, { status: 500 });
  }
};
