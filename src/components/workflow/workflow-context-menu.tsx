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
import { mutate } from "swr";

interface WorkflowContextMenuProps {
  children: React.ReactNode;
  workflow: DBWorkflow;
}

export function WorkflowContextMenu(props: WorkflowContextMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDeleteWorkflow = async () => {
    toast.promise(
      safe(() =>
        fetch(`/api/workflow/${props.workflow.id}`, {
          method: "DELETE",
        }),
      )
        .ifOk(() => {
          mutate("/api/workflow");
          setOpen(false);
        })
        .unwrap(),
      {
        success: "Workflow deleted",
        loading: "Delete...",
      },
    );
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
          >
            Delete
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
