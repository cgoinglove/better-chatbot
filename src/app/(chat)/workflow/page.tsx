"use client";
import { EditWorkflowPopup } from "@/components/workflow/edit-workflow-popup";
import { format } from "date-fns";

import { ArrowUpRight, LockKeyholeIcon, MoreHorizontal } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "ui/card";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Button } from "ui/button";
import { WorkflowContextMenu } from "@/components/workflow/workflow-context-menu";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import { Skeleton } from "ui/skeleton";
import { BackgroundPaths } from "ui/background-paths";

export default function WorkflowPage() {
  const { data: workflows, isLoading } = useSWR("/api/workflow", fetcher, {
    fallbackData: [],
  });

  return (
    <div className="w-full flex flex-col gap-4 p-8">
      <div className="flex w-full flex-col gap-2 mx-auto lg:flex-row lg:flex-wrap">
        <EditWorkflowPopup>
          <Card className="relative bg-secondary overflow-hidden w-full lg:w-sm xl:w-xs hover:bg-input transition-colors h-[190px] cursor-pointer">
            <div className="absolute inset-0 w-full h-full opacity-50">
              <BackgroundPaths />
            </div>
            <CardHeader>
              <CardTitle>
                <h1 className="text-lg font-bold">Create Workflow</h1>
              </CardTitle>
              <CardDescription className="mt-2">
                <p className="flex items-center gap-2">
                  Create a workflow to automate{" "}
                  <span className="text-foreground">your tasks.</span>
                  <ArrowUpRight className="size-3.5" />
                </p>
              </CardDescription>
            </CardHeader>
          </Card>
        </EditWorkflowPopup>
        {isLoading
          ? Array(7)
              .fill(null)
              .map((_, index) => (
                <Skeleton
                  key={index}
                  className="w-full lg:w-sm xl:w-xs h-[190px]"
                />
              ))
          : workflows.map((workflow) => (
              <Link href={`/workflow/${workflow.id}`} key={workflow.id}>
                <Card className="w-full lg:w-sm xl:w-xs cursor-pointer hover:bg-input transition-colors group">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex flex-col flex-1 min-w-0">
                      <CardTitle className="font-bold flex gap-2">
                        <div
                          style={{
                            backgroundColor:
                              workflow.icon?.style?.backgroundColor,
                          }}
                          className="p-2 rounded-lg flex items-center justify-center ring ring-background"
                        >
                          <Avatar className="size-6">
                            <AvatarImage src={workflow.icon?.value} />
                            <AvatarFallback></AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex flex-col justify-around">
                          <h4 className="text min-w-0 truncate">
                            {workflow.name}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {format(workflow.updatedAt, "MMM d, yyyy")}
                            {workflow.visibility == "private" && (
                              <LockKeyholeIcon className="size-2.5" />
                            )}
                          </p>
                        </div>
                      </CardTitle>
                      <CardDescription className="mt-4 text-xs h-12 line-clamp-3 overflow-hidden whitespace-pre-wrap break-words">
                        {workflow.description}
                      </CardDescription>
                      <div className="flex flex-row gap-2 justify-end">
                        <div onClick={(e) => e.stopPropagation()}>
                          <WorkflowContextMenu workflow={workflow}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100"
                            >
                              <MoreHorizontal />
                            </Button>
                          </WorkflowContextMenu>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
      </div>
    </div>
  );
}
