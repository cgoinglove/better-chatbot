import { platformRepository } from "lib/db/repository";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || DEFAULT_TENANT_ID;
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const url = new URL(request.url);

    const periodStartParam = url.searchParams.get("periodStart");
    const periodEndParam = url.searchParams.get("periodEnd");

    const now = new Date();
    const periodStart = periodStartParam
      ? new Date(periodStartParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = periodEndParam ? new Date(periodEndParam) : now;

    const [metrics, roiSnapshots] = await Promise.all([
      platformRepository.selectMetrics(
        tenantId,
        "sales-hunter",
        "conversion-rate",
        periodStart,
        periodEnd,
      ),
      platformRepository.selectROISnapshots(tenantId, "sales-hunter"),
    ]);

    return Response.json({
      metrics,
      roiSnapshots,
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
