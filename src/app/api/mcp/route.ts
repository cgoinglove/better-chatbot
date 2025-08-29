import { getSession } from "auth/server";
import { NextResponse } from "next/server";
import { saveMcpClientAction } from "./actions";
import { z } from "zod";
import {
  MCPRemoteConfigZodSchema,
  MCPStdioConfigZodSchema,
} from "app-types/mcp";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const McpPostSchema = z.object({
    name: z.string().min(1),
    config: z.union([MCPRemoteConfigZodSchema, MCPStdioConfigZodSchema]),
    visibility: z.enum(["public", "private", "readonly"]).optional(),
  });

  const result = McpPostSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json(
      { message: result.error.message },
      { status: 400 },
    );
  }
  const json = result.data;

  try {
    await saveMcpClientAction({
      ...json,
      userId: session.user.id,
      visibility: json.visibility ?? "private",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to save MCP client" },
      { status: 500 },
    );
  }
}
