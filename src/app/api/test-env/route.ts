// API route to test environment variables
import { NextRequest, NextResponse } from "next/server";
import { env } from "lib/env";
import { checkEnvVars } from "lib/next-env";

export async function GET(request: NextRequest) {
  try {
    // Check if environment variables are loaded
    const envStatus = {
      envVarsLoaded: checkEnvVars(),
      openRouterApiKey: env.OPENROUTER_API_KEY ? "Set" : "Not Set",
      googleApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY ? "Set" : "Not Set",
      openaiApiKey: env.OPENAI_API_KEY ? "Set" : "Not Set",
      anthropicApiKey: env.ANTHROPIC_API_KEY ? "Set" : "Not Set",
      xaiApiKey: env.XAI_API_KEY ? "Set" : "Not Set",
    };

    return NextResponse.json(
      { 
        status: "success", 
        message: "Environment variables status", 
        data: envStatus 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error checking environment variables:", error);
    return NextResponse.json(
      { 
        status: "error", 
        message: error.message || "Failed to check environment variables" 
      },
      { status: 500 }
    );
  }
}
