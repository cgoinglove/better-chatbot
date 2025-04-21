"use client";

import { Library, LibraryEntry } from "@/app-types/library";
import {
  getLibraryAction,
  getLibraryEntriesAction,
} from "@/app/api/library/actions";
import { appStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EditLibraryEntryDialog } from "./edit-library-entry-dialog";
import { LibraryEntryCard } from "./library-entry-card";

interface LibraryDetailProps {
  libraryId: string;
}

export function LibraryDetail({ libraryId }: LibraryDetailProps) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEntries, setFilteredEntries] = useState<LibraryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LibraryEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const router = useRouter();
  const { mutate } = appStore();

  useEffect(() => {
    loadLibraryAndEntries();
  }, [libraryId]);

  useEffect(() => {
    if (entries.length > 0 && searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.content.toLowerCase().includes(query) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(entries);
    }
  }, [entries, searchQuery]);

  const loadLibraryAndEntries = async () => {
    setIsLoading(true);
    try {
      const libraryData = await getLibraryAction(libraryId);
      if (!libraryData) {
        toast.error("Library not found");
        router.push("/library");
        return;
      }

      setLibrary(libraryData);
      mutate({ currentLibraryId: libraryId });

      const entriesData = await getLibraryEntriesAction(libraryId);
      setEntries(entriesData);
    } catch (error) {
      console.error("Error loading library:", error);
      toast.error("Failed to load library");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEntry = (entry: LibraryEntry) => {
    setSelectedEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleEntryUpdated = () => {
    loadLibraryAndEntries();
  };

  const handleEntryDeleted = () => {
    loadLibraryAndEntries();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading library...</div>;
  }

  if (!library) {
    return <div className="flex justify-center p-8">Library not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{library.name}</h1>
          {library.description && (
            <p className="text-muted-foreground">{library.description}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => router.push("/library")}>
          Back to Libraries
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            {entries.length === 0
              ? "This library doesn't have any entries yet."
              : "No entries match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEntries.map((entry) => (
            <LibraryEntryCard
              key={entry.id}
              entry={entry}
              onEdit={handleEditEntry}
              onDelete={handleEntryDeleted}
            />
          ))}
        </div>
      )}

      <EditLibraryEntryDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        entry={selectedEntry}
        onSuccess={handleEntryUpdated}
      />
    </div>
  );
}
