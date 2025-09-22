import { NextRequest } from "next/server";
export const runtime = "nodejs";
import { spawn } from "node:child_process";

export const POST = async (req: NextRequest) => {
  try {
    const { path } = await req.json();
    if (!path || typeof path !== "string") {
      return Response.json({ error: "path required" }, { status: 400 });
    }

    const tar = spawn("tar", ["-C", path, "-czf", "-", "."], {
      env: process.env,
    });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    tar.stdout.on("data", (c) => chunks.push(Buffer.from(c)));
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

    const base64 = Buffer.concat(chunks).toString("base64");
    return Response.json({ snapshot: base64 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "unknown" }, { status: 500 });
  }
};
