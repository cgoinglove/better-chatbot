import { platformRepository } from "lib/db/repository";
import {
  ConfigurableAgentCreateSchema,
  ConfigurableAgentUpdateSchema,
} from "app-types/platform";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || DEFAULT_TENANT_ID;
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const agents =
      await platformRepository.selectConfigurableAgentsByTenantId(
        tenantId,
        "sales-hunter",
      );

    return Response.json(agents);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
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

    const data = ConfigurableAgentCreateSchema.parse({
      ...body,
      tenantId,
      vertical: "sales-hunter",
    });

    const agent = await platformRepository.insertConfigurableAgent(data);

    return Response.json(agent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to create agent:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return Response.json(
        { error: "Agent ID is required" },
        { status: 400 },
      );
    }

    const data = ConfigurableAgentUpdateSchema.parse(updateData);

    const agent = await platformRepository.updateConfigurableAgent(
      id,
      tenantId,
      data,
    );

    return Response.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to update agent:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
