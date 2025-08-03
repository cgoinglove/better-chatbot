import { getSession } from "auth/server";
import { McpServerSchema } from "lib/db/pg/schema.pg";
import { NextResponse } from "next/server";
import { saveMcpClientAction } from "./actions";
import { OAUTH_REQUIRED_CODE } from "lib/const";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = (await request.json()) as typeof McpServerSchema.$inferInsert;

  try {
    const client = await saveMcpClientAction(json);
    if (client.client.status == "authorizing") {
      return NextResponse.json(
        {
          error: "OAuth authorization required",
          code: OAUTH_REQUIRED_CODE,
          authUrl: client.client.getAuthorizationUrl(),
        },
        { status: 401 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save MCP client" },
      { status: 500 },
    );
  }
}
