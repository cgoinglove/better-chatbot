import { archiveRepository } from "lib/db/repository";
import { getSession } from "auth/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id, itemId } = await params;

  try {
    // Check if archive exists and user owns it
    const archive = await archiveRepository.getArchiveById(id);

    if (!archive) {
      return Response.json({ error: "Archive not found" }, { status: 404 });
    }

    if (archive.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // Check if item exists in archive
    const items = await archiveRepository.getArchiveItems(id);
    const itemExists = items.some((item) => item.itemId === itemId);

    if (!itemExists) {
      return Response.json(
        { error: "Item not found in archive" },
        { status: 404 },
      );
    }

    await archiveRepository.removeItemFromArchive(id, itemId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to remove item from archive:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
