import { McpServerCustomizationZodSchema } from "app-types/mcp";
import { getSession } from "auth/server";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { mcpServerCustomizationRepository } from "lib/db/repository";

import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ server: string }> },
) {
  const { server } = await params;
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const mcpServerCustomization =
    await mcpServerCustomizationRepository.selectByUserIdAndMcpServerId({
      mcpServerId: server,
      userId: session.user.id,
    });

  return NextResponse.json(mcpServerCustomization ?? {});
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ server: string }> },
) {
  const { server } = await params;
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { mcpServerId, prompt } = McpServerCustomizationZodSchema.parse({
    ...body,
    mcpServerId: server,
  });

  const result =
    await mcpServerCustomizationRepository.upsertMcpServerCustomization({
      userId: session.user.id,
      mcpServerId,
      prompt,
    });
  const key = CacheKeys.mcpServerCustomizations(session.user.id);
  void serverCache.delete(key);

  return NextResponse.json(result);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ server: string }> },
) {
  const { server } = await params;
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  await mcpServerCustomizationRepository.deleteMcpServerCustomizationByMcpServerIdAndUserId(
    {
      mcpServerId: server,
      userId: session.user.id,
    },
  );
  const key = CacheKeys.mcpServerCustomizations(session.user.id);
  void serverCache.delete(key);

  return NextResponse.json({ success: true });
}
