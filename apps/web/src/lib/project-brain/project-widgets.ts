import "server-only";

import { asc, eq } from "drizzle-orm";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ProjectWidgetTable } from "@/lib/db/pg/schema.pg";

export async function getProjectWidgets(projectId: string) {
  return pgDb
    .select()
    .from(ProjectWidgetTable)
    .where(eq(ProjectWidgetTable.projectId, projectId))
    .orderBy(asc(ProjectWidgetTable.position), asc(ProjectWidgetTable.slot));
}
