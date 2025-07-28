"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Input } from "ui/input";
import { Textarea } from "ui/textarea";
import { Label } from "ui/label";
import { Button } from "ui/button";
import { Loader } from "lucide-react";
import { safe } from "ts-safe";
import { z } from "zod";
import { handleErrorWithToast } from "ui/shared-toast";
import { toast } from "sonner";
import { mutate } from "swr";
import { Archive } from "app-types/archive";
import { fetcher } from "lib/utils";

const zodSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

interface ArchiveDialogProps {
  children?: React.ReactNode;
  archive?: Archive;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ArchiveDialog({
  children,
  archive,
  open,
  onOpenChange,
  onSuccess,
}: ArchiveDialogProps) {
  const t = useTranslations();
  const isEdit = !!archive;

  const getInitialConfig = () => ({
    name: archive?.name || "",
    description: archive?.description || "",
  });

  const [config, setConfig] = useState(getInitialConfig);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await safe(() => zodSchema.parse(config))
        .map(async (body) => {
          if (isEdit) {
            return await fetcher(`/api/archive/${archive.id}`, {
              method: "PUT",
              body: JSON.stringify(body),
            });
          } else {
            return await fetcher("/api/archive", {
              method: "POST",
              body: JSON.stringify(body),
            });
          }
        })
        .ifOk(() => {
          toast.success(
            isEdit ? t("Archive.archiveUpdated") : t("Archive.archiveCreated"),
          );
          onOpenChange?.(false);
          onSuccess?.();
          mutate("/api/archive");
          if (!isEdit) {
            setConfig({ name: "", description: "" });
          }
        })
        .ifFail(handleErrorWithToast)
        .unwrap();
    } finally {
      setLoading(false);
    }
  }, [config, archive, isEdit, onOpenChange, onSuccess, t]);

  useEffect(() => {
    if (open) {
      setConfig(getInitialConfig());
    }
  }, [open, archive]);

  const handleOpenChange = (open: boolean) => {
    if (!open && !isEdit) {
      setConfig({ name: "", description: "" });
    }
    onOpenChange?.(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent hideClose className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Archive.editArchive") : t("Archive.addArchive")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("Archive.editArchiveDescription")
              : t("Archive.archiveDescriptionPlaceholder")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="archive-name">{t("Archive.archiveName")}</Label>
            <Input
              id="archive-name"
              value={config.name}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("Archive.archiveName")}
              className="bg-input border-transparent"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="archive-description">
              {t("Archive.archiveDescription")}
            </Label>
            <Textarea
              id="archive-description"
              value={config.description}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t("Archive.archiveDescriptionPlaceholder")}
              className="resize-none min-h-[100px] bg-input border-transparent"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("Common.cancel")}</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={loading || !config.name.trim()}
          >
            {t("Common.save")}
            {loading && <Loader className="size-3.5 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
