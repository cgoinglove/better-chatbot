"use client";

import { useSidebar } from "ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Toggle } from "ui/toggle";
import { PanelLeft } from "lucide-react";

export function AdminHeader() {
  const { toggleSidebar, open } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex items-center px-3 py-2 bg-background border-b">
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            aria-label="Toggle Sidebar"
            onClick={toggleSidebar}
            data-testid="admin-sidebar-toggle"
            data-state={open ? "open" : "closed"}
          >
            <PanelLeft />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent align="start" side="bottom">
          Toggle Sidebar
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />
    </header>
  );
}
