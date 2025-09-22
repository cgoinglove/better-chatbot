import { getSession } from "auth/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ConnectionsSchema = z.object({
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  VPS_HOST: z.string().optional(),
  VPS_USER: z.string().optional(),
  VPS_SSH_KEY: z.string().optional(),
});

// In-memory store per user (replace with DB in production)
const connectionsStore = new Map<string, z.infer<typeof ConnectionsSchema>>();

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = connectionsStore.get(session.user.id) || {};
    const masked = { ...current } as Record<string, string | undefined>;
    if (masked.DATABASE_URL) masked.DATABASE_URL = "****";
    if (masked.REDIS_URL) masked.REDIS_URL = "****";
    if (masked.VPS_SSH_KEY) masked.VPS_SSH_KEY = "****";
    return NextResponse.json(masked);
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = ConnectionsSchema.parse(body);
    const prev = connectionsStore.get(session.user.id) || {};

    const next = { ...prev } as Record<string, string | undefined>;
    for (const [k, v] of Object.entries(validated)) {
      if (typeof v === "string" && v !== "" && v !== "****") {
        next[k] = v;
      }
    }
    connectionsStore.set(session.user.id, next as any);
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
