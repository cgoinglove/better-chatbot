import { getSession } from "auth/server";
import { NextResponse } from "next/server";
import { pluginRepository } from "lib/db/repository";
import { canSeedPlugins } from "../validations";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeedPlugins((session.user as any).role ?? "user")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const plugins = await pluginRepository.seedPlugins(json.plugins);
  return NextResponse.json({ seeded: plugins.length });
}
