import { and, desc, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ProjectMemberTable, ProjectTable } from "@/lib/db/pg/schema.pg";
import {
  requireActiveOrganization,
  toProjectErrorResponse,
} from "@/lib/projects/access";
import { AGENTSET_EMBEDDING_PROFILE_IDS } from "@/types/project";

const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  goal: z.string().trim().max(4000).optional(),
  // Agentset retrieval profile chosen in the creation dialog; locked after
  // creation because changing it requires re-indexing the namespace.
  embeddingProfile: z.enum(AGENTSET_EMBEDDING_PROFILE_IDS).optional(),
});

export async function GET() {
  try {
    const actor = await requireActiveOrganization();
    const rows = await pgDb
      .selectDistinct({
        project: ProjectTable,
        role: ProjectMemberTable.role,
      })
      .from(ProjectTable)
      .leftJoin(
        ProjectMemberTable,
        and(
          eq(ProjectMemberTable.projectId, ProjectTable.id),
          eq(ProjectMemberTable.userId, actor.userId),
        ),
      )
      .where(
        and(
          eq(ProjectTable.organizationId, actor.organizationId),
          or(
            eq(ProjectTable.ownerUserId, actor.userId),
            eq(ProjectMemberTable.userId, actor.userId),
          ),
        ),
      )
      .orderBy(desc(ProjectTable.updatedAt));

    return NextResponse.json({
      projects: rows.map((row) => ({
        ...row.project,
        role: row.project.ownerUserId === actor.userId ? "owner" : row.role,
      })),
    });
  } catch (error) {
    return toProjectErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActiveOrganization();
    const parsed = CreateProjectSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_project",
            message: parsed.error.issues[0]?.message ?? "Invalid project.",
          },
        },
        { status: 400 },
      );
    }

    const project = await pgDb.transaction(async (tx) => {
      const [created] = await tx
        .insert(ProjectTable)
        .values({
          organizationId: actor.organizationId,
          ownerUserId: actor.userId,
          name: parsed.data.name,
          description: parsed.data.description,
          goal: parsed.data.goal,
          ...(parsed.data.embeddingProfile
            ? { agentsetEmbeddingProfile: parsed.data.embeddingProfile }
            : {}),
        })
        .returning();

      if (!created) throw new Error("Could not create project.");

      await tx
        .insert(ProjectMemberTable)
        .values({
          projectId: created.id,
          userId: actor.userId,
          role: "owner",
        })
        .onConflictDoNothing();

      return created;
    });

    return NextResponse.json({ project, role: "owner" }, { status: 201 });
  } catch (error) {
    return toProjectErrorResponse(error);
  }
}
