"use server";

import { archiveRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { ArchiveCreateSchema, ArchiveUpdateSchema } from "app-types/archive";

async function getUserId() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function createArchiveAction(data: {
  name: string;
  description?: string;
}) {
  const userId = await getUserId();
  const validatedData = ArchiveCreateSchema.parse(data);

  return await archiveRepository.createArchive({
    name: validatedData.name,
    description: validatedData.description || null,
    userId,
  });
}

export async function updateArchiveAction(
  id: string,
  data: { name?: string; description?: string },
) {
  const userId = await getUserId();

  // Check if user owns the archive
  const existingArchive = await archiveRepository.getArchiveById(id);
  if (!existingArchive || existingArchive.userId !== userId) {
    throw new Error("Archive not found or access denied");
  }

  const validatedData = ArchiveUpdateSchema.parse(data);

  return await archiveRepository.updateArchive(id, {
    name: validatedData.name,
    description: validatedData.description || null,
  });
}

export async function deleteArchiveAction(id: string) {
  const userId = await getUserId();

  // Check if user owns the archive
  const existingArchive = await archiveRepository.getArchiveById(id);
  if (!existingArchive || existingArchive.userId !== userId) {
    throw new Error("Archive not found or access denied");
  }

  await archiveRepository.deleteArchive(id);
}

export async function addItemToArchiveAction(
  archiveId: string,
  itemId: string,
) {
  const userId = await getUserId();

  // Check if user owns the archive
  const existingArchive = await archiveRepository.getArchiveById(archiveId);
  if (!existingArchive || existingArchive.userId !== userId) {
    throw new Error("Archive not found or access denied");
  }

  return await archiveRepository.addItemToArchive(archiveId, itemId, userId);
}

export async function removeItemFromArchiveAction(
  archiveId: string,
  itemId: string,
) {
  const userId = await getUserId();

  // Check if user owns the archive
  const existingArchive = await archiveRepository.getArchiveById(archiveId);
  if (!existingArchive || existingArchive.userId !== userId) {
    throw new Error("Archive not found or access denied");
  }

  await archiveRepository.removeItemFromArchive(archiveId, itemId);
}

export async function getItemArchivesAction(itemId: string) {
  const userId = await getUserId();
  return await archiveRepository.getItemArchives(itemId, userId);
}
