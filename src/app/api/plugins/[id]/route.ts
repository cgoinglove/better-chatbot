import { getSession } from "auth/server";
import { NextResponse } from "next/server";
import { pluginRepository } from "lib/db/repository";
import { getIsUserAdmin } from "lib/user/utils";
import { updatePluginSchema, canModifyPlugin } from "../validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plugin = await pluginRepository.getPluginById(id, session.user.id);
  if (!plugin)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(plugin);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plugin = await pluginRepository.getPluginById(id, session.user.id);
  if (!plugin)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = getIsUserAdmin(session.user);
  if (!canModifyPlugin(plugin, session.user.id, isAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = updatePluginSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

  const updated = await pluginRepository.updatePlugin(id, parsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plugin = await pluginRepository.getPluginById(id, session.user.id);
  if (!plugin)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = getIsUserAdmin(session.user);
  if (!canModifyPlugin(plugin, session.user.id, isAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await pluginRepository.deletePlugin(id);
  return NextResponse.json({ success: true });
}
