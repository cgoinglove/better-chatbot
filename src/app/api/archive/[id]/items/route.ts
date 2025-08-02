import { archiveRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";

const AddItemSchema = z.object({
  itemId: z.string(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if archive exists and user owns it
    const archive = await archiveRepository.getArchiveById(id);

    if (!archive) {
      return Response.json({ error: "Archive not found" }, { status: 404 });
    }

    if (archive.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const items = await archiveRepository.getArchiveItems(id);
    return Response.json(items);
  } catch (error) {
    console.error("Failed to fetch archive items:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if archive exists and user owns it
    const archive = await archiveRepository.getArchiveById(id);

    if (!archive) {
      return Response.json({ error: "Archive not found" }, { status: 404 });
    }

    if (archive.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const body = await request.json();
    const data = AddItemSchema.parse(body);

    const item = await archiveRepository.addItemToArchive(
      id,
      data.itemId,
      session.user.id,
    );

    return Response.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Failed to add item to archive:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
