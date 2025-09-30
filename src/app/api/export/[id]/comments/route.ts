import { getSession } from "auth/server";
import { chatExportRepository } from "lib/db/repository";
import { ChatExportCommentCreateSchema } from "app-types/chat-export";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/app/api/chat/actions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId().catch(() => undefined);

    const comments = await chatExportRepository.selectCommentsByExportId(
      id,
      userId,
    );
    return NextResponse.json(comments);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get comments" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validatedData = ChatExportCommentCreateSchema.parse({
      exportId: id,
      authorId: session.user.id,
      parentId: body.parentId,
      content: body.content,
    });

    await chatExportRepository.insertComment(validatedData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 500 },
    );
  }
}
