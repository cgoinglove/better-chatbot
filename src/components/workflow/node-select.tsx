"use client";

import { NodeKind } from "lib/ai/workflow/interface";
import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { NodeIcon } from "./node-icon";

const unSupportedKinds: NodeKind[] = [
  NodeKind.Code,
  NodeKind.Http,
  NodeKind.Condition,
  NodeKind.Tool,
];

export function NodeSelect({
  children,
  onChange,
}: {
  onChange: (nodeKind: NodeKind) => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="center" className="w-64">
        {Object.keys(NodeKind)
          .filter((key) => NodeKind[key] !== NodeKind.Start)
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
                <span className="ml-auto text-xs text-muted-foreground">
                  Soon...
                </span>
              )}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
