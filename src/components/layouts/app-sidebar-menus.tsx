import { cn } from "lib/utils";
import {
  BookMarked,
  BookText,
  Code,
  Database,
  Edit3,
  FileCode,
  Github,
  Library,
  MessageCircleDashed,
} from "lucide-react";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "ui/tooltip";

export function AppSidebarMenus({ isOpen }: { isOpen: boolean }) {
  return (
    <SidebarGroup className={cn(isOpen && "px-4")}>
      <SidebarGroupContent>
        <SidebarMenu className="mb-3">
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex  justify-center ",
                        "border border-dashed border-ring/80 font-semibold",
                      )}
                    >
                      <MessageCircleDashed />
                      New Chat
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>New Chat</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
        <SidebarMenu>
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/mcp">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex justify-center font-semibold",
                      )}
                    >
                      {!isOpen && <Library />}
                      MCP Configuration
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>MCP Configuration</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
        <SidebarMenu className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/canvas">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex justify-center font-semibold",
                      )}
                    >
                      {!isOpen && <Edit3 />}
                      Canvas
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Canvas Mode</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
        <SidebarMenu className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/library">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex justify-center font-semibold",
                      )}
                    >
                      {!isOpen && <BookMarked />}
                      Libraries
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Knowledge Libraries</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
        <SidebarMenu className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/rules">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex justify-center font-semibold",
                      )}
                    >
                      {!isOpen && <BookText />}
                      Rule Engine
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Rule Engine</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
        <SidebarMenu className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/github">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex justify-center font-semibold",
                      )}
                    >
                      {!isOpen && <Github />}
                      GitHub
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>GitHub Repositories</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
        <SidebarMenu className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/test-code-execution">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex justify-center font-semibold",
                      )}
                    >
                      {!isOpen && <Code />}
                      Code Execution
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Test Code Execution</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
        <SidebarMenu className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/code-snippets">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex justify-center font-semibold",
                      )}
                    >
                      {!isOpen && <FileCode />}
                      Code Snippets
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Manage Code Snippets</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
        <SidebarMenu className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/rag">
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        isOpen && "flex justify-center font-semibold",
                      )}
                    >
                      {!isOpen && <Database />}
                      RAG System
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Retrieval-Augmented Generation</p>
                  </TooltipContent>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
