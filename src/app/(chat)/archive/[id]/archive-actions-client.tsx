"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "ui/button";
import { Settings2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { ArchiveDialog } from "@/components/archive-dialog";

import { toast } from "sonner";
import { Archive } from "app-types/archive";
import { deleteArchiveAction } from "@/app/api/archive/actions";
import { mutate } from "swr";

interface ArchiveActionsClientProps {
  archive: Archive;
}

export function ArchiveActionsClient({ archive }: ArchiveActionsClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteArchiveAction(archive.id);
      toast.success(t("Archive.archiveDeleted"));
      router.push("/");
    } catch (error) {
      console.error("Failed to delete archive:", error);
      toast.error(t("Archive.failedToDeleteArchive"));
    } finally {
      mutate("/api/archive");
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleEditSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditDialogOpen(true)}
          className="h-8 px-2"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          className="h-8 px-2 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ArchiveDialog
        archive={archive}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Archive.deleteArchive")}</DialogTitle>
            <DialogDescription>
              {t("Archive.confirmDeleteArchive")}
              <br />
              <br />
              {t("Archive.deleteArchiveDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t("Common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("Common.deleting") : t("Common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
