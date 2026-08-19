import { NextResponse } from "next/server";
import { withAuth } from "auth/route-guard";
import { requireProjectAccess } from "@/lib/projects/access";
import { getProjectWidgets } from "@/lib/project-brain/project-widgets";

export const GET = withAuth(
  async (
    _request: Request,
    session,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id: projectId } = await params;
    await requireProjectAccess({ projectId, userId: session.user.id });

    const widgets = await getProjectWidgets(projectId);
    return NextResponse.json({ widgets });
  },
);

// Manual refresh ("Refresh" button) — pulls fresh data via the project's
// scoped Composio tools and re-renders its widgets.
