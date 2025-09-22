export const runtime = "nodejs";
import { getSession } from "auth/server";
import { UserPreferencesZodSchema } from "app-types/user";
import { userRepository } from "lib/db/repository";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const preferences = await userRepository.getPreferences(session.user.id);
    return NextResponse.json(preferences ?? {});
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get preferences" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const json = await request.json();
    const preferences = UserPreferencesZodSchema.parse(json);
    const updatedUser = await userRepository.updatePreferences(
      session.user.id,
      preferences,
    );
    return NextResponse.json({
      success: true,
      preferences: updatedUser.preferences,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update preferences" },
      { status: 500 },
    );
  }
}
