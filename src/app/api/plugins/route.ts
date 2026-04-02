import { getSession } from "auth/server";
import { NextResponse } from "next/server";
import { pluginRepository } from "lib/db/repository";
import { insertPluginSchema } from "./validations";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = request.headers.get("x-tenant-id") ?? DEFAULT_TENANT_ID;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const enabledOnly = searchParams.get("enabled") === "true";
  const category = searchParams.get("category");

  let plugins = enabledOnly
    ? await pluginRepository.listEnabledPluginsForUser(
        session.user.id,
        tenantId,
      )
    : await pluginRepository.listPluginsForUser(session.user.id, tenantId);

  if (scope === "personal")
    plugins = plugins.filter((p) => p.userId === session.user.id);
  if (scope === "org")
    plugins = plugins.filter((p) => p.tenantId !== null && p.userId === null);
  if (category) plugins = plugins.filter((p) => p.category === category);

  return NextResponse.json(plugins);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json();
  const parsed = insertPluginSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

  const plugin = await pluginRepository.insertPlugin({
    ...parsed.data,
    userId: session.user.id,
    tenantId: null,
    isBuiltIn: false,
  });

  return NextResponse.json(plugin, { status: 201 });
}
