import { appStore } from "@/app/store";
import { ChevronDownIcon, WrenchIcon } from "lucide-react";
import { PropsWithChildren, useMemo } from "react";
import { Button } from "ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";

import { useShallow } from "zustand/shallow";

export function EnabledMcpToolsDropdown({
  children,
  align,
  side,
  prependTools = [],
}: PropsWithChildren<{
  align?: "start" | "end";
  prependTools?: {
    id: string;
    name: string;
    tools: {
      name: string;
      description: string;
    }[];
  }[];
  side?: "left" | "right" | "top" | "bottom";
}>) {
  const [allowedMcpServers, mcpList, noToolChoice] = appStore(
    useShallow((state) => [
      state.allowedMcpServers,
      state.mcpList,
      state.toolChoice == "none",
    ]),
  );

  const EnabledMcpToolsDropdown = useMemo(() => {
    const mcpTools = mcpList
      .map((mcp) => {
        const allowedMcpServerTools = allowedMcpServers?.[mcp.id]?.tools;
        const tools = mcp.toolInfo.map((tool) => {
          return {
            name: tool.name,
            description: tool.description,
          };
        });
        return {
          name: mcp.name,
          id: mcp.id,
          tools: allowedMcpServerTools
            ? tools.filter((tool) => allowedMcpServerTools.includes(tool.name))
            : tools,
        };
      })
      .filter((v) => v.tools.length);
    return [...prependTools, ...mcpTools];
  }, [allowedMcpServers, mcpList]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button variant={"secondary"}>
            Tool <ChevronDownIcon />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40" side={side} align={align}>
        <DropdownMenuGroup className="cursor-pointer">
          {!noToolChoice && EnabledMcpToolsDropdown.length ? (
            EnabledMcpToolsDropdown.map((mcp) => {
              return (
                <DropdownMenuSub key={mcp.id}>
                  <DropdownMenuSubTrigger>
                    <p className="text-sm font-medium flex items-center gap-2 min-w-32">
                      <WrenchIcon className="size-3.5" />
                      <span className="truncate">{mcp.name}</span>
                    </p>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {mcp.tools.map((tool) => {
                        return (
                          <DropdownMenuItem key={tool.name}>
                            <div className="flex text-xs flex-col w-40">
                              <p className=" truncate">{tool.name}</p>
                              <p className="text-muted-foreground truncate">
                                {tool.description}
                              </p>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              );
            })
          ) : (
            <DropdownMenuItem>
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  No tools available
                </p>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
