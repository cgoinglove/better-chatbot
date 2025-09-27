import { getSession } from "auth/server";
import { McpServerTable } from "lib/db/pg/schema.pg";
import { NextResponse } from "next/server";
import { saveMcpClientAction } from "./actions";
import { canCreateMCP } from "lib/auth/permissions";
import { logger } from "better-auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to create MCP connections
  const hasPermission = await canCreateMCP();
  if (!hasPermission) {
    return NextResponse.json(
      { error: "You don't have permission to create MCP connections" },
      { status: 403 },
    );
  }

  const json = (await request.json()) as typeof McpServerTable.$inferInsert;

  try {
    const result = await saveMcpClientAction(json);

    return NextResponse.json({ success: true, id: result.client.getInfo().id });
  } catch (error: any) {
    logger.error("Failed to save MCP client", { error });
    return NextResponse.json(
      { message: error.message || "Failed to save MCP client" },
      { status: 500 },
    );
  }
}
