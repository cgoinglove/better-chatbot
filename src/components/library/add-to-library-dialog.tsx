"use client";

import { Library } from "@/app-types/library";
import {
  createLibraryEntryAction,
  getUserLibrariesAction,
} from "@/app/api/library/actions";
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

interface AddToLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  source?: string;
  sourceType?: string;
}

export function AddToLibraryDialog({
  isOpen,
  onClose,
  content,
  source,
  sourceType = "chat",
}: AddToLibraryDialogProps) {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [editedContent, setEditedContent] = useState<string>(content);
  const [tags, setTags] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadLibraries();
      setEditedContent(content);
    }
  }, [isOpen, content]);

  const loadLibraries = async () => {
    try {
      const userLibraries = await getUserLibrariesAction();
      setLibraries(userLibraries);
      if (userLibraries.length > 0) {
        setSelectedLibraryId(userLibraries[0].id);
      }
    } catch (error) {
      console.error("Error loading libraries:", error);
      toast.error("Failed to load libraries");
    }
  };

  const handleSubmit = async () => {
    if (!selectedLibraryId) {
      toast.error("Please select a library");
      return;
    }

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

      await createLibraryEntryAction({
        libraryId: selectedLibraryId,
        title,
        content: editedContent,
        source,
        sourceType,
        tags: tagArray,
      });

      toast.success("Added to library");
      onClose();
    } catch (error) {
      console.error("Error adding to library:", error);
      toast.error("Failed to add to library");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Library</DialogTitle>
          <DialogDescription>
            Save this content to one of your libraries for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="library" className="text-right">
              Library
            </Label>
            <select
              id="library"
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedLibraryId}
              onChange={(e) => setSelectedLibraryId(e.target.value)}
            >
              {libraries.length === 0 ? (
                <option value="">No libraries available</option>
              ) : (
                libraries.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.name}
                  </option>
                ))
              )}
            </select>
          </div>

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
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
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
            {isLoading ? "Saving..." : "Save to Library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
