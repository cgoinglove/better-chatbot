"use client";

import {
  deleteRepositoryAction,
  indexRepositoryAction,
} from "@/app/api/github/actions";
import { appStore } from "@/app/store";
import { GitHubRepository } from "app-types/github";
import { formatDistanceToNow } from "date-fns";
import {
  Edit,
  ExternalLink,
  FolderOpen,
  MoreHorizontal,
  RefreshCw,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "ui/alert-dialog";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Dialog, DialogContent } from "ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { useShallow } from "zustand/shallow";
import { GitHubRepositoryForm } from "./github-repository-form";

interface GitHubRepositoryListProps {
  repositories: GitHubRepository[];
}

export function GitHubRepositoryList({
  repositories,
}: GitHubRepositoryListProps) {
  const [editRepository, setEditRepository] = useState<GitHubRepository | null>(
    null,
  );
  const [deleteRepository, setDeleteRepository] =
    useState<GitHubRepository | null>(null);
  const [indexingRepository, setIndexingRepository] = useState<string | null>(
    null,
  );

  const [appStoreMutate, repositoryList] = appStore(
    useShallow((state) => [state.mutate, state.githubRepositoryList]),
  );

  const handleDelete = async () => {
    if (!deleteRepository) return;

    try {
      const success = await deleteRepositoryAction(deleteRepository.id);

      if (success) {
        // Remove the repository from the store
        const updatedRepositoryList =
          repositoryList?.filter((r) => r.id !== deleteRepository.id) || [];

        appStoreMutate({ githubRepositoryList: updatedRepositoryList });
        toast.success("Repository removed");
      } else {
        toast.error("Failed to remove repository");
      }
    } catch (error) {
      console.error("Error deleting repository:", error);
      toast.error("An error occurred");
    } finally {
      setDeleteRepository(null);
    }
  };

  const handleIndex = async (repository: GitHubRepository) => {
    setIndexingRepository(repository.id);

    try {
      const result = await indexRepositoryAction(repository.id);

      if (result.success) {
        toast.success(result.message);

        // Update the repository in the store with new lastIndexed time
        const updatedRepositoryList =
          repositoryList?.map((r) => {
            if (r.id === repository.id) {
              return {
                ...r,
                lastIndexed: new Date(),
              };
            }
            return r;
          }) || [];

        appStoreMutate({ githubRepositoryList: updatedRepositoryList });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error indexing repository:", error);
      toast.error("An error occurred while indexing");
    } finally {
      setIndexingRepository(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Indexed</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repositories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-6 text-muted-foreground"
                >
                  No repositories found. Add a repository to get started.
                </TableCell>
              </TableRow>
            ) : (
              repositories.map((repository) => (
                <TableRow key={repository.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/github/repository/${repository.id}`}
                      className="hover:underline flex items-center"
                    >
                      {repository.name}
                      <ExternalLink className="ml-1 h-3 w-3 text-muted-foreground" />
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {repository.path}
                  </TableCell>
                  <TableCell>
                    {repository.isEnabled ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-700 border-gray-200"
                      >
                        Disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {repository.lastIndexed ? (
                      formatDistanceToNow(new Date(repository.lastIndexed), {
                        addSuffix: true,
                      })
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleIndex(repository)}
                          disabled={indexingRepository === repository.id}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {indexingRepository === repository.id
                            ? "Indexing..."
                            : "Index Repository"}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/github/repository/${repository.id}`}>
                            <FolderOpen className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setEditRepository(repository)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteRepository(repository)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Repository Dialog */}
      <Dialog
        open={!!editRepository}
        onOpenChange={(open) => !open && setEditRepository(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          {editRepository && (
            <GitHubRepositoryForm
              repository={editRepository}
              onCancel={() => setEditRepository(null)}
              onSuccess={() => setEditRepository(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Repository Alert Dialog */}
      <AlertDialog
        open={!!deleteRepository}
        onOpenChange={(open) => !open && setDeleteRepository(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the repository from the system. The actual
              repository files will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
