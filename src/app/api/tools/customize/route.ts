import { NextResponse } from "next/server";
import { getSession } from "auth/server";
import { toolCustomizationRepository } from "lib/db/repository";
import { ToolCustomizationZodSchema } from "app-types/tool-customization";
import { z } from "zod";

// Temporary stub route to avoid 404 errors when front-end queries tool customizations.
// Replace with full implementation once the database schema and repository are merged.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const toolName = url.searchParams.get("toolName");
  const mcpServerName = url.searchParams.get("mcpServerName");

  try {
    if (toolName && mcpServerName) {
      const item = await toolCustomizationRepository.getToolCustomization(
        session.user.id,
        toolName,
        mcpServerName,
      );
      return NextResponse.json(item ?? {});
    }

    const list = await toolCustomizationRepository.getUserToolCustomizations(
      session.user.id,
    );
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = ToolCustomizationZodSchema.parse(body);

    const result = await toolCustomizationRepository.upsertToolCustomization({
      userId: session.user.id,
      toolName: data.toolName,
      mcpServerName: data.mcpServerName,
      customPrompt: data.customPrompt ?? null,
      enabled: data.enabled ?? true,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to save" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { toolName, mcpServerName } = z
      .object({ toolName: z.string(), mcpServerName: z.string() })
      .parse(body);

    await toolCustomizationRepository.deleteToolCustomization(
      session.user.id,
      toolName,
      mcpServerName,
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to delete" },
      { status: 400 },
    );
  }
}
