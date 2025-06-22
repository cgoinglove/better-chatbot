"use client";
import { DBWorkflow } from "app-types/workflow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { EditWorkflowPopup } from "./edit-workflow-popup";
import { useState } from "react";
import { safe } from "ts-safe";

import { toast } from "sonner";
import { handleErrorWithToast } from "ui/shared-toast";
import { mutate } from "swr";
import { Loader2 } from "lucide-react";

interface WorkflowContextMenuProps {
  children: React.ReactNode;
  workflow: DBWorkflow;
}

export function WorkflowContextMenu(props: WorkflowContextMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteWorkflow, setDeleteWorkflow] = useState(false);

  const handleDeleteWorkflow = async () => {
    setDeleteWorkflow(true);
    await safe(() =>
      fetch(`/api/workflow/${props.workflow.id}`, {
        method: "DELETE",
      }),
    )
      .ifOk(() => {
        toast.success("Workflow deleted");
        mutate("/api/workflow");
        setOpen(false);
      })
      .ifFail(handleErrorWithToast)
      .watch(() => setDeleteWorkflow(false));
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>{props.children}</DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            className="cursor-pointer text-sm"
            onClick={() => setEditOpen(true)}
          >
            Info Update
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteWorkflow();
            }}
            disabled={deleteWorkflow}
          >
            Delete
            {deleteWorkflow && <Loader2 className="size-4 ml-2 animate-spin" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditWorkflowPopup
        defaultValue={props.workflow}
        submitAfterRoute={false}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
