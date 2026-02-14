import { platformRepository } from "lib/db/repository";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || DEFAULT_TENANT_ID;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;

    const connector = await platformRepository.selectConnectorById(
      id,
      tenantId,
    );
    if (!connector) {
      return Response.json(
        { error: "Connector not found" },
        { status: 404 },
      );
    }

    // Update connector status to syncing
    await platformRepository.updateConnector(id, tenantId, {
      status: "syncing",
    });

    // Create a sync log entry (actual sync runs async/in background)
    const syncLog = await platformRepository.insertSyncLog({
      connectorId: id,
      status: "running",
      recordsProcessed: 0,
      recordsFailed: 0,
      errorMessage: null,
      startedAt: new Date(),
      completedAt: null,
    });

    return Response.json({
      status: "started",
      syncLogId: syncLog.id,
    });
  } catch (error) {
    console.error("Failed to trigger sync:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
