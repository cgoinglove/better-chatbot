export const runtime = "nodejs";
import { getSession } from "auth/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { encrypt } from "lib/encryption";

const APIKeySchema = z.record(z.string(), z.string());

// Mock storage for API keys - in production, use a secure database
// This is a simple in-memory store for demonstration
const apiKeyStore = new Map<string, Record<string, string>>();

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const encryptedKeys = apiKeyStore.get(session.user.id) || {};

    // Return status without actual keys for security
    const keyStatus: Record<string, { hasKey: boolean; isValid?: boolean }> =
      {};

    const providers = [
      "openai",
      "google",
      "anthropic",
      "xai",
      "groq",
      "openRouter",
      "exa",
    ];

    providers.forEach((provider) => {
      const hasKey = !!encryptedKeys[provider];
      keyStatus[provider] = {
        hasKey,
        // In a real implementation, you might store validation status
        isValid: hasKey ? undefined : undefined,
      };
    });

    return NextResponse.json(keyStatus);
  } catch (error) {
    console.error("Error fetching API keys:", error);
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
    const validatedKeys = APIKeySchema.parse(body);

    // Encrypt and store the keys
    const encryptedKeys: Record<string, string> = {};
    Object.entries(validatedKeys).forEach(([provider, key]) => {
      if (key && key !== "****" && typeof key === "string") {
        encryptedKeys[provider] = encrypt(key);
      }
    });

    apiKeyStore.set(session.user.id, encryptedKeys);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving API keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
