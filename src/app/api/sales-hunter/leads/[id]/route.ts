import { salesHunterRepository } from "lib/db/repository";
import { LeadUpdateSchema } from "app-types/platform";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || DEFAULT_TENANT_ID;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;

    const lead = await salesHunterRepository.selectLeadById(id, tenantId);
    if (!lead) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    return Response.json(lead);
  } catch (error) {
    console.error("Failed to fetch lead:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;
    const body = await request.json();

    const data = LeadUpdateSchema.parse(body);

    const lead = await salesHunterRepository.updateLead(id, tenantId, data);

    return Response.json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to update lead:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;

    await salesHunterRepository.deleteLead(id, tenantId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lead:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
