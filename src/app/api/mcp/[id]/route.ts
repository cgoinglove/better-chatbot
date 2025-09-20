import { NextRequest, NextResponse } from "next/server";
import { removeMcpClientAction } from "../actions";
import { pgMcpRepository } from "../../../../lib/db/pg/repositories/mcp-repository.pg";
import { getSession } from "auth/server";

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const mcpServer = await pgMcpRepository.selectById(params.id);
    if (!mcpServer) {
      return NextResponse.json(
        { error: "MCP server not found" },
        { status: 404 },
      );
    }
    if (mcpServer.userId !== session?.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await pgMcpRepository.deleteById(params.id);
    await removeMcpClientAction(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete MCP server:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete MCP server",
      },
      {
        status:
          error instanceof Error && error.message.includes("permission")
            ? 403
            : 500,
      },
    );
  }
}
