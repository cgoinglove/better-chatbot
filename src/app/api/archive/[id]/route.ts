import { archiveRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";
import { ArchiveUpdateSchema } from "app-types/archive";

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
    const archive = await archiveRepository.getArchiveById(id);

    if (!archive) {
      return Response.json({ error: "Archive not found" }, { status: 404 });
    }

    // Check if user owns this archive
    if (archive.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // Get archive items
    const items = await archiveRepository.getArchiveItems(id);

    return Response.json({
      ...archive,
      items,
    });
  } catch (error) {
    console.error("Failed to fetch archive:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
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
    const existingArchive = await archiveRepository.getArchiveById(id);

    if (!existingArchive) {
      return Response.json({ error: "Archive not found" }, { status: 404 });
    }

    if (existingArchive.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const body = await request.json();
    const data = ArchiveUpdateSchema.parse(body);

    const archive = await archiveRepository.updateArchive(id, {
      name: data.name,
      description: data.description || null,
    });

    return Response.json(archive);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Failed to update archive:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
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
    const existingArchive = await archiveRepository.getArchiveById(id);

    if (!existingArchive) {
      return Response.json({ error: "Archive not found" }, { status: 404 });
    }

    if (existingArchive.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    await archiveRepository.deleteArchive(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete archive:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
