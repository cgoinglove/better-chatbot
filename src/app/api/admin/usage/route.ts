import { NextRequest, NextResponse } from "next/server";
import { platformRepository } from "lib/db/repository";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const tenantId = searchParams.get("tenantId");
  const periodStart = searchParams.get("periodStart");
  const periodEnd = searchParams.get("periodEnd");

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 }
    );
  }

  const now = new Date();
  const startDate = periodStart
    ? new Date(periodStart)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = periodEnd ? new Date(periodEnd) : now;

  try {
    const usage = await platformRepository.selectUsageSummary(
      tenantId,
      startDate,
      endDate
    );

    return NextResponse.json({ usage });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
