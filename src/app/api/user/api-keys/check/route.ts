import { getSession } from "auth/server";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decrypt } from "lib/encryption";

const CheckKeySchema = z.object({
  provider: z.string(),
});

// Mock storage for API keys - in production, use a secure database
const apiKeyStore = new Map<string, Record<string, string>>();

async function validateAPIKey(
  provider: string,
  apiKey: string,
): Promise<boolean> {
  // This is a mock validation - in production, you would make actual API calls
  // to validate the keys with each provider

  if (!apiKey || apiKey === "****") return false;

  // Mock validation logic based on key format
  switch (provider) {
    case "openai":
      return apiKey.startsWith("sk-") && apiKey.length > 20;
    case "google":
      return apiKey.startsWith("AI") && apiKey.length > 20;
    case "anthropic":
      return apiKey.startsWith("sk-ant-") && apiKey.length > 20;
    case "xai":
      return apiKey.startsWith("xai-") && apiKey.length > 20;
    case "groq":
      return apiKey.startsWith("gsk_") && apiKey.length > 20;
    case "openRouter":
      return apiKey.startsWith("sk-or-") && apiKey.length > 20;
    case "exa":
      return apiKey.startsWith("exa_") && apiKey.length > 20;
    default:
      return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider } = CheckKeySchema.parse(body);

    const encryptedKeys = apiKeyStore.get(session.user.id) || {};
    const encryptedKey = encryptedKeys[provider];

    if (!encryptedKey) {
      return NextResponse.json({ isValid: false, error: "No API key found" });
    }

    try {
      const apiKey = decrypt(encryptedKey);
      const isValid = await validateAPIKey(provider, apiKey);
      return NextResponse.json({ isValid });
    } catch (error) {
      console.error("Error decrypting API key:", error);
      return NextResponse.json({
        isValid: false,
        error: "Invalid API key format",
      });
    }
  } catch (error) {
    console.error("Error checking API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
