"use client";

import { NodeKind } from "lib/ai/workflow/workflow.interface";
import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { NodeIcon } from "./node-icon";

const unSupportedKinds: NodeKind[] = [NodeKind.Code, NodeKind.Http];

export function NodeSelect({
  children,
  onChange,
  open,
  onOpenChange,
}: {
  onChange: (nodeKind: NodeKind) => void;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="center" className="w-64">
        <NodeSelectContent onChange={onChange} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NodeSelectContent({
  onChange,
}: { onChange: (nodeKind: NodeKind) => void }) {
  return Object.keys(NodeKind)
    .filter((key) => NodeKind[key] !== NodeKind.Input)
    .sort((a, b) => {
      const aIndex = unSupportedKinds.indexOf(NodeKind[a]);
      const bIndex = unSupportedKinds.indexOf(NodeKind[b]);
      return aIndex - bIndex;
    })
    .map((key) => (
      <DropdownMenuItem
        disabled={unSupportedKinds.includes(NodeKind[key])}
        onClick={() => {
          if (unSupportedKinds.includes(NodeKind[key])) {
            return;
          }
          onChange(NodeKind[key]);
        }}
        key={key}
      >
        <NodeIcon type={NodeKind[key]} />
        {key}

        {unSupportedKinds.includes(NodeKind[key]) && (
          <span className="ml-auto text-xs text-muted-foreground">Soon...</span>
        )}
      </DropdownMenuItem>
    ));
}
