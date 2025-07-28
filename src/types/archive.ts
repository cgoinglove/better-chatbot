import { z } from "zod";

export const ArchiveCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const ArchiveUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type Archive = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ArchiveItem = {
  id: string;
  archiveId: string;
  itemId: string;
  userId: string;
  addedAt: Date;
};

export type ArchiveWithItemCount = Archive & {
  itemCount: number;
};

export type ArchiveRepository = {
  createArchive(
    archive: Omit<Archive, "id" | "createdAt" | "updatedAt">,
  ): Promise<Archive>;
  getArchivesByUserId(userId: string): Promise<ArchiveWithItemCount[]>;
  getArchiveById(id: string): Promise<Archive | null>;
  updateArchive(
    id: string,
    archive: Partial<Omit<Archive, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Archive>;
  deleteArchive(id: string): Promise<void>;

  addItemToArchive(
    archiveId: string,
    itemId: string,
    userId: string,
  ): Promise<ArchiveItem>;
  removeItemFromArchive(archiveId: string, itemId: string): Promise<void>;
  getArchiveItems(archiveId: string): Promise<ArchiveItem[]>;
  getItemArchives(itemId: string, userId: string): Promise<Archive[]>;
};
