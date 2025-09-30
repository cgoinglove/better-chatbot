import { getSession } from "auth/server";
import { chatExportRepository } from "lib/db/repository";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exports = await chatExportRepository.selectSummaryByExporterId(
      session.user.id,
    );
    return NextResponse.json(exports);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get exports" },
      { status: 500 },
    );
  }
}
