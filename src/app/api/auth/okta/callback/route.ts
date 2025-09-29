import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pgDb } from "lib/db/pg/db.pg";
import { UserSchema, AccountSchema, SessionSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      console.error("Okta OAuth error:", error);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=oauth_error`,
      );
    }

    if (!code || !state) {
      console.error("Missing code or state in Okta callback");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=missing_params`,
      );
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get("okta_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      console.error("State mismatch in Okta callback");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=state_mismatch`,
      );
    }

    // Exchange code for tokens
    const oktaDomain = process.env.OKTA_DOMAIN;
    const clientId = process.env.OKTA_CLIENT_ID;
    const clientSecret = process.env.OKTA_CLIENT_SECRET;

    if (!oktaDomain || !clientId || !clientSecret) {
      console.error("Okta configuration incomplete");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=config_error`,
      );
    }

    const tokenResponse = await fetch(`https://${oktaDomain}/oauth2/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: `${request.nextUrl.origin}/api/auth/okta/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Failed to exchange code for tokens");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=token_exchange_failed`,
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Okta
    const userInfoResponse = await fetch(
      `https://${oktaDomain}/oauth2/v1/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      console.error("Failed to get user info from Okta");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=userinfo_failed`,
      );
    }

    const userInfo = await userInfoResponse.json();

    // Create or find user in database
    try {
      // Check if user exists
      const user = await pgDb
        .select()
        .from(UserSchema)
        .where(eq(UserSchema.email, userInfo.email))
        .limit(1);

      let userId: string;

      if (user.length === 0) {
        // Create new user
        const newUser = await pgDb
          .insert(UserSchema)
          .values({
            email: userInfo.email,
            name: userInfo.name || userInfo.preferred_username,
            image: userInfo.picture,
            emailVerified: true, // Okta users are pre-verified
          })
          .returning();

        userId = newUser[0].id;

        // Create account record for Okta
        await pgDb.insert(AccountSchema).values({
          accountId: userInfo.sub,
          providerId: "okta",
          userId: userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        userId = user[0].id;

        // Update existing account tokens
        await pgDb
          .update(AccountSchema)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            accessTokenExpiresAt: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000)
              : null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(AccountSchema.userId, userId),
              eq(AccountSchema.providerId, "okta"),
            ),
          );
      }

      // Create session
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await pgDb.insert(SessionSchema).values({
        userId: userId,
        expiresAt: expiresAt,
        token: sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Set session cookie and redirect
      const response = NextResponse.redirect(`${request.nextUrl.origin}/`);

      response.cookies.set("better-auth.session_token", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
      });

      // Clear OAuth cookies
      response.cookies.delete("okta_oauth_state");
      response.cookies.delete("okta_oauth_nonce");

      return response;
    } catch (authError) {
      console.error("Failed to create user/session:", authError);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=auth_failed`,
      );
    }
  } catch (error) {
    console.error("Okta callback error:", error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/sign-in?error=callback_error`,
    );
  }
}
