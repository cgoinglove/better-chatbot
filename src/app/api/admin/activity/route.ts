import { NextRequest, NextResponse } from "next/server";
import { platformRepository } from "lib/db/repository";
import type { ActivityAction } from "app-types/platform";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const tenantId = searchParams.get("tenantId");
  const userId = searchParams.get("userId") || undefined;
  const action = (searchParams.get("action") as ActivityAction) || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 }
    );
  }

  try {
    const [activities, total] = await Promise.all([
      platformRepository.selectActivityLogs(tenantId, {
        userId,
        action,
        limit,
        offset,
      }),
      platformRepository.countActivityLogs(tenantId, {
        userId,
        action,
      }),
    ]);

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
