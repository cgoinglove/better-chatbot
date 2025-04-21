"use client";

import { createLibraryAction } from "@/app/api/library/actions";
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
import { useState } from "react";
import { toast } from "sonner";

interface CreateLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (libraryId: string) => void;
}

export function CreateLibraryDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateLibraryDialogProps) {
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!name) {
      toast.error("Please enter a name for the library");
      return;
    }

    setIsLoading(true);

    try {
      const library = await createLibraryAction({
        name,
        description: description || null,
      });

      if (library) {
        toast.success("Library created successfully");
        if (onSuccess) {
          onSuccess(library.id);
        }
        onClose();
        // Reset form
        setName("");
        setDescription("");
      } else {
        toast.error("Failed to create library");
      }
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error("Failed to create library");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Library</DialogTitle>
          <DialogDescription>
            Create a new library to organize and store information from your
            chats.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="My Knowledge Base"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="A collection of useful information from my chats"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
