"use client";

import { LibraryEntry } from "@/app-types/library";
import { updateLibraryEntryAction } from "@/app/api/library/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditLibraryEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LibraryEntry | null;
  onSuccess?: () => void;
}

export function EditLibraryEntryDialog({
  isOpen,
  onClose,
  entry,
  onSuccess,
}: EditLibraryEntryDialogProps) {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setTags(entry.tags ? entry.tags.join(", ") : "");
    }
  }, [entry]);

  const handleSubmit = async () => {
    if (!entry) return;

    if (!title) {
      toast.error("Please enter a title");
      return;
    }

    setIsLoading(true);

    try {
      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const updatedEntry = await updateLibraryEntryAction(entry.id, {
        title,
        content,
        tags: tagArray,
      });

      if (updatedEntry) {
        toast.success("Entry updated successfully");
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        toast.error("Failed to update entry");
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("Failed to update entry");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Library Entry</DialogTitle>
          <DialogDescription>
            Update the information in this library entry.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Tags
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="col-span-3"
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Label htmlFor="content" className="text-right">
              Content
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="col-span-3"
              rows={8}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
