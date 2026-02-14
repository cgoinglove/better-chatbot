import { NextRequest, NextResponse } from "next/server";
import { platformRepository } from "lib/db/repository";
import { TenantCreateSchema } from "app-types/platform";

export async function GET() {
  try {
    const tenants = await platformRepository.selectAllTenants();

    return NextResponse.json({ tenants });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TenantCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tenant = await platformRepository.insertTenant(parsed.data);

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "A tenant with this slug already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}
