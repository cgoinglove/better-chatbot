"use client";
import { WorkflowDB } from "app-types/workflow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { EditWorkflowPopup } from "./edit-workflow-popup";
import { useState } from "react";

interface WorkflowContextMenuProps {
  children: React.ReactNode;
  workflow: WorkflowDB;
}

export function WorkflowContextMenu(props: WorkflowContextMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {" "}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{props.children}</DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            className="cursor-pointer text-sm"
            onClick={() => setOpen(true)}
          >
            Info Update
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-sm"
            variant="destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditWorkflowPopup
        defaultValue={props.workflow}
        submitAfterRoute={false}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
