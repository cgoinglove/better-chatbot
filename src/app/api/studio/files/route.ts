import { getSession } from "auth/server";
import { NextRequest, NextResponse } from "next/server";
import { getWorkspacePath } from "lib/studio/workspace";
import { promises as fs } from "node:fs";
import { join } from "node:path";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const pathParam = url.searchParams.get("path") || "";
  const base = getWorkspacePath(session.user.id);
  const full = join(base, pathParam);
  try {
    const stat = await fs.stat(full);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(full, { withFileTypes: true });
      return NextResponse.json(
        entries.map((e) => ({ name: e.name, dir: e.isDirectory() })),
      );
    } else {
      const content = await fs.readFile(full, "utf-8");
      return NextResponse.json({ content });
    }
  } catch (_e) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const base = getWorkspacePath(session.user.id);
  const full = join(base, String(body.path || ""));
  await fs.mkdir(join(full, ".."), { recursive: true }).catch(() => {});
  await fs.writeFile(full, String(body.content || ""), "utf-8");
  return NextResponse.json({ ok: true });
}
