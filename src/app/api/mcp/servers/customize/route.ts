import { NextResponse } from "next/server";
import { getSession } from "auth/server";
import {
  mcpServerCustomizationRepository,
  mcpRepository,
} from "lib/db/repository";
import { z } from "zod";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const serverName = url.searchParams.get("serverName");

  try {
    if (serverName) {
      const data =
        await mcpServerCustomizationRepository.getServerCustomization(
          session.user.id,
          serverName,
        );
      return NextResponse.json(data ?? {});
    }
    const list =
      await mcpServerCustomizationRepository.getUserServerCustomizations(
        session.user.id,
      );
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const schema = z.object({
      serverName: z.string(),
      customInstructions: z.string().max(8000).optional().nullable(),
    });
    const { serverName, customInstructions } = schema.parse(body);

    // Ensure the referenced server exists – lightweight validation only
    const exists = await mcpRepository.selectByServerName(serverName);
    if (!exists) {
      throw new Error("Server not found");
    }

    const result =
      await mcpServerCustomizationRepository.upsertServerCustomization({
        userId: session.user.id,
        mcpServerName: serverName,
        customInstructions,
        enabled: true,
      });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const serverName = url.searchParams.get("serverName");
    if (!serverName) throw new Error("serverName required");
    await mcpServerCustomizationRepository.deleteServerCustomization(
      session.user.id,
      serverName,
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed" },
      { status: 400 },
    );
  }
}
