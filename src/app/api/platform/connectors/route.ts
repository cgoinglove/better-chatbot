import { platformRepository } from "lib/db/repository";
import { ConnectorCreateSchema } from "app-types/platform";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || DEFAULT_TENANT_ID;
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const connectors =
      await platformRepository.selectConnectorsByTenantId(tenantId);

    return Response.json(connectors);
  } catch (error) {
    console.error("Failed to fetch connectors:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();

    const data = ConnectorCreateSchema.parse({
      ...body,
      tenantId,
    });

    const connector = await platformRepository.insertConnector(data);

    return Response.json(connector, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to create connector:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
