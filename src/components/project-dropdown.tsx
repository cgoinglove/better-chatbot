"use client";
import {
  deleteProjectAction,
  updateProjectNameAction,
} from "@/app/api/chat/actions";
import { appStore } from "@/app/store";
import { Project } from "app-types/chat";
import { Loader, PencilLine, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { type PropsWithChildren, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { safe } from "ts-safe";
import { Button } from "ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";

type Props = PropsWithChildren<{
  project: Pick<Project, "id" | "name">;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "end" | "center";
}>;

export function ProjectDropdown({ project, children, side, align }: Props) {
  const router = useRouter();

  const currentProjectId = appStore((state) => state.currentProjectId);

  const [open, setOpen] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    safe()
      .watch(() => setIsDeleting(true))
      .ifOk(() => deleteProjectAction(project.id))
      .watch(() => setIsDeleting(false))
      .watch(({ isOk, error }) => {
        if (isOk) {
          toast.success("Project deleted");
        } else {
          toast.error(error.message || "Failed to delete project");
        }
      })
      .ifOk(() => {
        if (currentProjectId === project.id) {
          router.push("/");
        }
        mutate("threads");
        mutate("projects");
      })
      .unwrap();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="p-0 w-[220px]" side={side} align={align}>
        <Command>
          <div className="flex items-center gap-2 px-2 py-1 text-sm pt-2 font-semibold">
            Project
          </div>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem className="cursor-pointer p-0">
                <UpdateProjectNameDialog
                  initialName={project.name}
                  onUpdated={() => setOpen(false)}
                  projectId={project.id}
                >
                  <div className="flex items-center gap-2 w-full px-2 py-1 rounded">
                    <PencilLine className="text-foreground" />
                    Rename Project
                  </div>
                </UpdateProjectNameDialog>
              </CommandItem>
              <CommandItem disabled={isDeleting} className="cursor-pointer p-0">
                <div
                  className="flex items-center gap-2 w-full px-2 py-1 rounded"
                  onClick={handleDelete}
                >
                  <Trash className="text-destructive" />
                  <span className="text-destructive">Delete Project</span>
                  {isDeleting && (
                    <Loader className="ml-auto h-4 w-4 animate-spin" />
                  )}
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function UpdateProjectNameDialog({
  initialName,
  children,
  onUpdated,
  projectId,
}: PropsWithChildren<{
  initialName: string;
  onUpdated: (name: string) => void;
  projectId: string;
}>) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(initialName);

  const handleUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    return safe(() => updateProjectNameAction(projectId, name))

      .watch(({ isOk, error }) => {
        setIsUpdating(false);
        setIsOpen(false);
        if (isOk) {
          onUpdated(name);
          mutate("projects");
          mutate(`/projects/${projectId}`);
          toast.success("Project updated");
        } else {
          toast.error(error.message || "Failed to update project");
        }
      })
      .unwrap();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent hideClose>
        <DialogHeader>
          <DialogTitle>Rename Project</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>

          <Button variant="outline" onClick={handleUpdate}>
            {isUpdating ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              "Update"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
