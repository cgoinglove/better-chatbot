import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ProjectMemberTable, UserTable } from "@/lib/db/pg/schema.pg";
import { isUserMemberOfOrganization } from "@/lib/organization/members";
import {
  requireProjectAccess,
  toProjectErrorResponse,
} from "@/lib/projects/access";

const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["viewer", "editor"]).default("editor"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess({ projectId });

    const members = await pgDb
      .select({
        id: ProjectMemberTable.id,
        userId: ProjectMemberTable.userId,
        role: ProjectMemberTable.role,
        createdAt: ProjectMemberTable.createdAt,
        name: UserTable.name,
        email: UserTable.email,
        image: UserTable.image,
      })
      .from(ProjectMemberTable)
      .innerJoin(UserTable, eq(ProjectMemberTable.userId, UserTable.id))
      .where(eq(ProjectMemberTable.projectId, projectId));

    return NextResponse.json({ members });
  } catch (error) {
    return toProjectErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const { actor, project } = await requireProjectAccess({
      projectId,
      minRole: "editor",
    });
    const parsed = AddMemberSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_member",
            message: parsed.error.issues[0]?.message ?? "Invalid member.",
          },
        },
        { status: 400 },
      );
    }

    const { userId, role } = parsed.data;

    if (userId === project.ownerUserId) {
      return NextResponse.json(
        {
          error: {
            code: "cannot_modify_owner",
            message: "The project owner's membership can't be changed here.",
          },
        },
        { status: 409 },
      );
    }

    const isOrgMember = await isUserMemberOfOrganization(
      actor.organizationId,
      userId,
    );
    if (!isOrgMember) {
      return NextResponse.json(
        {
          error: {
            code: "not_org_member",
            message: "That user isn't a member of this organization.",
          },
        },
        { status: 422 },
      );
    }

    const [member] = await pgDb
      .insert(ProjectMemberTable)
      .values({ projectId, userId, role })
      .onConflictDoUpdate({
        target: [ProjectMemberTable.projectId, ProjectMemberTable.userId],
        set: { role },
      })
      .returning();

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return toProjectErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const { project } = await requireProjectAccess({
      projectId,
      minRole: "editor",
    });

    const userId = new URL(request.url).searchParams.get("userId");
    const parsed = z.string().uuid().safeParse(userId);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_member",
            message: "A valid userId is required.",
          },
        },
        { status: 400 },
      );
    }

    if (parsed.data === project.ownerUserId) {
      return NextResponse.json(
        {
          error: {
            code: "cannot_remove_owner",
            message: "The project owner can't be removed.",
          },
        },
        { status: 409 },
      );
    }

    const deleted = await pgDb
      .delete(ProjectMemberTable)
      .where(
        and(
          eq(ProjectMemberTable.projectId, projectId),
          eq(ProjectMemberTable.userId, parsed.data),
        ),
      )
      .returning({ id: ProjectMemberTable.id });

    if (!deleted.length) {
      return NextResponse.json(
        {
          error: {
            code: "member_not_found",
            message: "That person isn't a member of this project.",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toProjectErrorResponse(error);
  }
}
