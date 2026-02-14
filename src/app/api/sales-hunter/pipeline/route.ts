import { salesHunterRepository } from "lib/db/repository";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || DEFAULT_TENANT_ID;
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const [pipelineValue, leadCounts] = await Promise.all([
      salesHunterRepository.calculatePipelineValue(tenantId),
      salesHunterRepository.countLeadsByStatus(tenantId),
    ]);

    return Response.json({
      totalValue: pipelineValue.totalValue,
      byStatus: pipelineValue.byStatus,
      leadCounts,
    });
  } catch (error) {
    console.error("Failed to fetch pipeline data:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
