import { salesHunterRepository } from "lib/db/repository";
import { LeadCreateSchema } from "app-types/platform";
import type { LeadStatus, LeadSource } from "app-types/platform";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

function getTenantId(request: Request): string {
  return request.headers.get("x-tenant-id") || DEFAULT_TENANT_ID;
}

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const url = new URL(request.url);

    const status = url.searchParams.get("status") as LeadStatus | null;
    const source = url.searchParams.get("source") as LeadSource | null;
    const assignedTo = url.searchParams.get("assignedTo") || undefined;
    const minScore = url.searchParams.get("minScore")
      ? Number(url.searchParams.get("minScore"))
      : undefined;
    const search = url.searchParams.get("search") || undefined;
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || "25")),
    );
    const offset = (page - 1) * limit;

    const leads = await salesHunterRepository.selectLeadsByTenantId(tenantId, {
      status: status || undefined,
      source: source || undefined,
      assignedTo,
      minScore,
      limit,
      offset,
    });

    // Client-side search filter (name, email, company)
    const filtered = search
      ? leads.filter((lead) => {
          const term = search.toLowerCase();
          return (
            lead.firstName.toLowerCase().includes(term) ||
            lead.lastName.toLowerCase().includes(term) ||
            (lead.email && lead.email.toLowerCase().includes(term)) ||
            (lead.company && lead.company.toLowerCase().includes(term))
          );
        })
      : leads;

    return Response.json({
      leads: filtered,
      pagination: {
        page,
        limit,
        total: filtered.length,
        hasMore: leads.length === limit,
      },
    });
  } catch (error) {
    console.error("Failed to fetch leads:", error);
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

    const data = LeadCreateSchema.parse({
      ...body,
      tenantId,
    });

    const lead = await salesHunterRepository.insertLead(data);

    return Response.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Failed to create lead:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
