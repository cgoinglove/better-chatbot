import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const oktaDomain = process.env.OKTA_DOMAIN;
    const clientId = process.env.OKTA_CLIENT_ID;

    if (!oktaDomain || !clientId) {
      return NextResponse.json(
        { error: "Okta configuration is incomplete" },
        { status: 400 },
      );
    }

    // Generate state and nonce for PKCE/security
    const state = Math.random().toString(36).substring(2, 15);
    const nonce = Math.random().toString(36).substring(2, 15);
    const redirectUri = `${request.nextUrl.origin}/api/auth/okta/callback`;

    const authUrl = new URL(`https://${oktaDomain}/oauth2/v1/authorize`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid profile email");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("nonce", nonce);

    // Create response with redirect
    const response = NextResponse.redirect(authUrl.toString());

    // Store state and nonce in cookies for verification
    response.cookies.set("okta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    response.cookies.set("okta_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("Okta OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Okta OAuth" },
      { status: 500 },
    );
  }
}
