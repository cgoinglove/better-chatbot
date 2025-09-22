import { getSession } from "auth/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ConnectionsSchema = z.object({
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  VPS_HOST: z.string().optional(),
  VPS_USER: z.string().optional(),
  VPS_SSH_KEY: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  NETLIFY_AUTH_TOKEN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  otp: z.string().optional(),
});

// In-memory store per user (replace with DB in production)
const connectionsStore = new Map<string, z.infer<typeof ConnectionsSchema>>();
const otpStore = new Map<string, { code: string; exp: number }>();

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
    if (masked.VERCEL_TOKEN) masked.VERCEL_TOKEN = "****";
    if (masked.NETLIFY_AUTH_TOKEN) masked.NETLIFY_AUTH_TOKEN = "****";
    if (masked.GITHUB_TOKEN) masked.GITHUB_TOKEN = "****";
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
    // 2FA check
    const record = otpStore.get(session.user.id);
    if (
      !validated.otp ||
      !record ||
      record.code !== validated.otp ||
      Date.now() > record.exp
    ) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 },
      );
    }
    const prev = connectionsStore.get(session.user.id) || {};

    const next = { ...prev } as Record<string, string | undefined>;
    for (const [k, v] of Object.entries(validated)) {
      if (typeof v === "string" && v !== "" && v !== "****") {
        next[k] = v;
      }
    }
    connectionsStore.set(session.user.id, next as any);
    otpStore.delete(session.user.id);
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Issue OTP (for demo we return it; in production send via email/SMS/TOTP)
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(session.user.id, { code, exp: Date.now() + 5 * 60 * 1000 });
    return NextResponse.json({ otp: code, exp: 300 });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
