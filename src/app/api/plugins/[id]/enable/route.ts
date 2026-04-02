import { getSession } from "auth/server";
import { NextResponse } from "next/server";
import { pluginRepository } from "lib/db/repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userPlugin = await pluginRepository.enablePlugin(session.user.id, id);
  return NextResponse.json(userPlugin);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await pluginRepository.disablePlugin(session.user.id, id);
  return NextResponse.json({ success: true });
}
