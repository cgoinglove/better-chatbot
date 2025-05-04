"use client";

import { useSidebar } from "ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "ui/tooltip";
import { Toggle } from "ui/toggle";
import {
  ChevronDown,
  ChevronRight,
  MoonStar,
  PanelLeft,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "ui/button";
import { Separator } from "ui/separator";

import { useMemo } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { ThreadDropdown } from "../thread-dropdown";
import { appStore } from "@/app/store";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { GithubIcon } from "ui/github-icon";
import { useShallow } from "zustand/shallow";

function ThreadDropdownComponent() {
  const [threadList, currentThreadId, projectList] = appStore(
    useShallow((state) => [
      state.threadList,
      state.currentThreadId,
      state.projectList,
    ]),
  );
  const currentThread = useMemo(() => {
    return threadList.find((thread) => thread.id === currentThreadId);
  }, [threadList, currentThreadId]);

  const currentProject = useMemo(() => {
    return projectList.find(
      (project) => project.id === currentThread?.projectId,
    );
  }, [currentThread, projectList]);

  if (!currentThread) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="w-1 h-4">
        <Separator orientation="vertical" />
      </div>
      {currentProject && (
        <>
          <Link href={`/project/${currentProject.id}`}>
            <Button variant="ghost" className="flex items-center gap-1">
              <p className="text-muted-foreground max-w-32 truncate">
                {currentProject.name}
              </p>
            </Button>
          </Link>
          <ChevronRight size={14} className="text-muted-foreground" />
        </>
      )}

      <ThreadDropdown
        threadId={currentThread.id}
        beforeTitle={currentThread.title}
      >
        <div className="text-sm hover:text-foreground cursor-pointer flex gap-1 items-center px-2 py-1 rounded-md hover:bg-accent">
          <span className="truncate whitespace-nowrap overflow-hidden max-w-60 lg:max-w-80">
            {currentThread.title}
          </span>
          <ChevronDown size={14} />
        </div>
      </ThreadDropdown>
    </div>
  );
}

export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const currentPaths = usePathname();

  const componentByPage = useMemo(() => {
    if (currentPaths.startsWith("/chat/")) {
      return <ThreadDropdownComponent />;
    }
  }, [currentPaths]);

  const isMounted = useMounted();

  const icon = useMemo(() => {
    return theme === "dark" ? <Sun /> : <MoonStar />;
  }, [theme]);

  return (
    <header className="sticky top-0 z-50 flex items-center px-2 py-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle aria-label="Toggle italic" onClick={toggleSidebar}>
              <PanelLeft />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent align="start" side="bottom">
            <p>Toggle Sidebar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {componentByPage}
      <div className="flex-1" />
      <Link
        href={
          currentPaths.startsWith("/temporary-chat") ? "/" : "/temporary-chat"
        }
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={"sm"}
              variant={
                currentPaths.startsWith("/temporary-chat")
                  ? "secondary"
                  : "ghost"
              }
            >
              {/* <MessageCircleDashed className="w-4 h-4 fill-foreground" /> */}
              temporary
            </Button>
          </TooltipTrigger>
          <TooltipContent align="end" side="bottom">
            <p>Temporary Chat</p>
          </TooltipContent>
        </Tooltip>
      </Link>
      <Link
        href="https://github.com/cgoinglove/mcp-client-chatbot"
        target="_blank"
      >
        <Button variant="ghost" size="icon">
          <GithubIcon className="w-4 h-4 fill-foreground" />
        </Button>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {isMounted && icon}
      </Button>
    </header>
  );
}
