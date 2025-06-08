"use client";
import { deleteThreadAction, updateThreadAction } from "@/app/api/chat/actions";
import { appStore } from "@/app/store";
import { useLatest } from "@/hooks/use-latest";
import {
  Loader,
  PencilLine,
  Trash,
  WandSparkles,
  Share2,
  CheckCircle,
  Lock,
  Globe,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type PropsWithChildren, useState } from "react";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { toast } from "sonner";
import { mutate } from "swr";
import { safe } from "ts-safe";
import { Button } from "ui/button";
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
import { CreateProjectWithThreadPopup } from "./create-project-with-thread-popup";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  ShareIcon,
  TrashIcon,
} from "@/components/icons";

type Props = PropsWithChildren<{
  threadId: string;
  beforeTitle?: string;
  onDeleted?: () => void;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "end" | "center";
}>;

export function ThreadDropdown({
  threadId,
  children,
  beforeTitle,
  onDeleted,
  side,
  align,
}: Props) {
  const router = useRouter();

  const push = useLatest(router.push);

  const currentThreadId = appStore((state) => state.currentThreadId);
  const currentThread = appStore((state) =>
    state.threadList.find((t) => t.id === threadId),
  );

  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { visibilityType, setVisibilityType } = useChatVisibility({
    threadId: threadId,
    initialVisibility: currentThread?.visibility || "private",
  });

  const handleUpdate = async (title: string) => {
    safe()
      .ifOk(() => {
        if (!title) {
          throw new Error("Title is required");
        }
      })
      .ifOk(() => updateThreadAction(threadId, { title }))
      .ifOk(() => mutate("threads"))
      .watch(({ isOk, error }) => {
        if (isOk) {
          toast.success("Thread updated");
        } else {
          toast.error(error.message || "Failed to update thread");
        }
      });
  };

  const handleDelete = (event: Event) => {
    event.preventDefault();
    safe()
      .watch(() => setIsDeleting(true))
      .ifOk(() => deleteThreadAction(threadId))
      .watch(() => setIsDeleting(false))
      .watch(() => setOpen(false))
      .watch(({ isOk, error }) => {
        if (isOk) {
          toast.success("Thread deleted");
        } else {
          toast.error(error.message || "Failed to delete thread");
        }
      })
      .ifOk(() => onDeleted?.())
      .ifOk(() => {
        if (currentThreadId === threadId) {
          push.current("/");
        }
        mutate("threads");
      })
      .unwrap();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-[220px]" align={align} side={side}>
        <DropdownMenuItem asChild>
          <CreateProjectWithThreadPopup
            threadId={threadId}
            onClose={() => setOpen(false)}
          >
            <div className="flex items-center gap-2 w-full cursor-pointer">
              <WandSparkles className="h-4 w-4" />
              <span>Summarize as Project</span>
            </div>
          </CreateProjectWithThreadPopup>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <UpdateThreadNameDialog
            initialTitle={beforeTitle ?? ""}
            onUpdated={(title) => handleUpdate(title)}
          >
            <div className="flex items-center gap-2 w-full cursor-pointer">
              <PencilLine className="h-4 w-4" />
              <span>Rename</span>
            </div>
          </UpdateThreadNameDialog>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                className="cursor-pointer flex-row justify-between"
                onClick={() => {
                  setVisibilityType("private");
                }}
              >
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Private</span>
                </div>
                {visibilityType === "private" && (
                  <CheckCircle className="h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer flex-row justify-between"
                onClick={() => {
                  setVisibilityType("public");
                }}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Public</span>
                </div>
                {visibilityType === "public" && (
                  <CheckCircle className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
          onSelect={handleDelete}
          disabled={isDeleting}
        >
          <Trash className="h-4 w-4 mr-2" />
          <span>Delete Chat</span>
          {isDeleting && <Loader className="ml-auto h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UpdateThreadNameDialog({
  initialTitle,
  children,
  onUpdated,
}: PropsWithChildren<{
  initialTitle: string;
  onUpdated: (title: string) => void;
}>) {
  const [title, setTitle] = useState(initialTitle);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <Input
            type="text"
            value={title}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onUpdated(title);
              }
            }}
            onInput={(e) => {
              setTitle(e.currentTarget.value);
            }}
          />
        </DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="outline" onClick={() => onUpdated(title)}>
              Update
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
