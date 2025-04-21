"use client";

import { Library } from "@/app-types/library";
import {
  deleteLibraryAction,
  getUserLibrariesAction,
} from "@/app/api/library/actions";
import { appStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreateLibraryDialog } from "./create-library-dialog";

export function LibraryList() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();
  const { mutate } = appStore();

  useEffect(() => {
    loadLibraries();
  }, []);

  const loadLibraries = async () => {
    setIsLoading(true);
    try {
      const userLibraries = await getUserLibrariesAction();
      setLibraries(userLibraries);
      mutate({ libraryList: userLibraries });
    } catch (error) {
      console.error("Error loading libraries:", error);
      toast.error("Failed to load libraries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLibrary = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this library? All entries will be permanently deleted.",
      )
    ) {
      try {
        const success = await deleteLibraryAction(id);
        if (success) {
          toast.success("Library deleted successfully");
          loadLibraries();
        } else {
          toast.error("Failed to delete library");
        }
      } catch (error) {
        console.error("Error deleting library:", error);
        toast.error("Failed to delete library");
      }
    }
  };

  const handleLibraryCreated = (libraryId: string) => {
    loadLibraries();
    router.push(`/library/${libraryId}`);
  };

  const handleLibraryClick = (library: Library) => {
    mutate({ currentLibraryId: library.id });
    router.push(`/library/${library.id}`);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading libraries...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Libraries</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Create Library
        </Button>
      </div>

      {libraries.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            You don't have any libraries yet.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create Your First Library
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {libraries.map((library) => (
            <Card
              key={library.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className="hover:text-primary transition-colors"
                  onClick={() => handleLibraryClick(library)}
                >
                  {library.name}
                </CardTitle>
                {library.description && (
                  <CardDescription>{library.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Created: {new Date(library.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLibrary(library.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateLibraryDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleLibraryCreated}
      />
    </div>
  );
}
