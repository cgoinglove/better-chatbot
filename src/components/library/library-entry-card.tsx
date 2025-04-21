"use client";

import { LibraryEntry } from "@/app-types/library";
import { deleteLibraryEntryAction } from "@/app/api/library/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

interface LibraryEntryCardProps {
  entry: LibraryEntry;
  onDelete?: () => void;
  onEdit?: (entry: LibraryEntry) => void;
}

export function LibraryEntryCard({
  entry,
  onDelete,
  onEdit,
}: LibraryEntryCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this entry?")) {
      setIsDeleting(true);
      try {
        const success = await deleteLibraryEntryAction(entry.id);
        if (success) {
          toast.success("Entry deleted successfully");
          if (onDelete) {
            onDelete();
          }
        } else {
          toast.error("Failed to delete entry");
        }
      } catch (error) {
        console.error("Error deleting entry:", error);
        toast.error("Failed to delete entry");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(entry);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{entry.title}</CardTitle>
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap">{entry.content}</div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {entry.sourceType && (
            <span>
              Source: {entry.sourceType}
              {entry.source && ` (${entry.source})`}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
