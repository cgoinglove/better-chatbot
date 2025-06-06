import { getSession } from "auth/server";
import { mcpMcpToolCustomizationRepository } from "lib/db/repository";

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
    await mcpMcpToolCustomizationRepository.selectByUserIdAndMcpServerId({
      mcpServerId: server,
      userId: session.user.id,
    });

  return NextResponse.json(mcpServerCustomization);
}
