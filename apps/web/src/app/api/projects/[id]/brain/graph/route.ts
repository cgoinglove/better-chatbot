import { NextResponse } from "next/server";
import { getProjectKnowledgeGraph } from "@/lib/project-brain/graph";
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
    return NextResponse.json(await getProjectKnowledgeGraph(projectId));
  } catch (error) {
    return toProjectErrorResponse(error);
  }
}
