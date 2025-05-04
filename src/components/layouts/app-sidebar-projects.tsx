"use client";

import { SidebarGroupLabel, SidebarMenuAction } from "ui/sidebar";
import Link from "next/link";
import { SidebarMenuButton, SidebarMenuSkeleton } from "ui/sidebar";
import { SidebarGroupContent, SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroup } from "ui/sidebar";
import { FolderOpen, MoreHorizontal, Plus } from "lucide-react";

import { useMounted } from "@/hooks/use-mounted";
import { appStore } from "@/app/store";
import { Button } from "ui/button";

import { useShallow } from "zustand/shallow";

import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import useSWR from "swr";
import { selectProjectListByUserIdAction } from "@/app/api/chat/actions";
import { handleErrorWithToast } from "ui/shared-toast";
import { CreateProjectPopup } from "../create-project-popup";
import { ProjectDropdown } from "../project-dropdown";

export function AppSidebarProjects() {
  const mounted = useMounted();

  const [storeMutate, currentProjectId] = appStore(
    useShallow((state) => [state.mutate, state.currentProjectId]),
  );

  const { data: projectList, isLoading } = useSWR(
    "projects",
    selectProjectListByUserIdAction,
    {
      onError: handleErrorWithToast,
      fallbackData: [],
      onSuccess: (data) => storeMutate({ projectList: data }),
    },
  );

  return (
    <SidebarGroup>
      <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/projects">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarGroupLabel className="">
              <h4 className="text-xs text-muted-foreground flex items-center gap-1">
                Projects
              </h4>
              <div className="flex-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <CreateProjectPopup>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover/projects:opacity-100"
                    >
                      <Plus />
                    </Button>
                  </CreateProjectPopup>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>New Project</p>
                </TooltipContent>
              </Tooltip>
            </SidebarGroupLabel>

            {isLoading ? (
              Array.from({ length: 2 }).map(
                (_, index) => mounted && <SidebarMenuSkeleton key={index} />,
              )
            ) : projectList.length == 0 ? (
              <div className="px-2 mt-1">
                <CreateProjectPopup>
                  <div className="py-4 px-4 hover:bg-accent rounded-2xl cursor-pointer flex justify-between items-center">
                    <div className="gap-1">
                      <p className="font-semibold mb-1">Create a project </p>
                      <p className="text-muted-foreground">
                        To organize your ideas
                      </p>
                    </div>
                    <FolderOpen className="size-4" />
                  </div>
                </CreateProjectPopup>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {projectList?.map((project) => (
                  <SidebarMenu
                    key={project.id}
                    className={"group/project mr-0"}
                  >
                    <SidebarMenuItem className="px-2 cursor-pointer">
                      <SidebarMenuButton
                        asChild
                        isActive={currentProjectId === project.id}
                      >
                        <div className="flex gap-1">
                          <div className="p-1 rounded-md hover:bg-foreground/40">
                            <FolderOpen className="size-4" />
                          </div>

                          <Link
                            href={`/project/${project.id}`}
                            className="flex items-center min-w-0 w-full"
                          >
                            <p className="truncate">{project.name}</p>
                          </Link>
                          <SidebarMenuAction className="opacity-0 group-hover/project:opacity-100 mr-2">
                            <ProjectDropdown project={project} side="right">
                              <MoreHorizontal className="size-4" />
                            </ProjectDropdown>
                          </SidebarMenuAction>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                ))}
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
