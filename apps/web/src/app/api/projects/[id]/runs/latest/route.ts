import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ProjectBrainRunTable } from "@/lib/db/pg/schema.pg";
import {
  requireProjectAccess,
  toProjectErrorResponse,
} from "@/lib/projects/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess({ projectId });

    const [run] = await pgDb
      .select()
      .from(ProjectBrainRunTable)
      .where(eq(ProjectBrainRunTable.projectId, projectId))
      .orderBy(desc(ProjectBrainRunTable.createdAt))
      .limit(1);

    return NextResponse.json(run ?? null);
  } catch (error) {
    return toProjectErrorResponse(error);
  }
}
