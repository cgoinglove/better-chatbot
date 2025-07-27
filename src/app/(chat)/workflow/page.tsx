"use client";
import { EditWorkflowPopup } from "@/components/workflow/edit-workflow-popup";
import { format } from "date-fns";

import {
  ArrowUpRight,
  ChevronDown,
  MoreHorizontal,
  MousePointer2,
} from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "ui/card";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Button } from "ui/button";
import { WorkflowContextMenu } from "@/components/workflow/workflow-context-menu";
import useSWR, { mutate } from "swr";
import { fetcher } from "lib/utils";
import { Skeleton } from "ui/skeleton";
import { BackgroundPaths } from "ui/background-paths";
import {
  DBEdge,
  DBNode,
  DBWorkflow,
  WorkflowSummary,
} from "app-types/workflow";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { BabyResearch, GetWeather } from "lib/ai/workflow/examples";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "ui/dialog";
import { WorkflowGreeting } from "@/components/workflow/workflow-greeting";

const createWithExample = async (exampleWorkflow: {
  workflow: Partial<DBWorkflow>;
  nodes: Partial<DBNode>[];
  edges: Partial<DBEdge>[];
}) => {
  const response = await fetch("/api/workflow", {
    method: "POST",
    body: JSON.stringify({
      ...exampleWorkflow.workflow,
      noGenerateInputNode: true,
      isPublished: true,
    }),
  });

  if (!response.ok) return toast.error("Error creating workflow");
  const workflow = await response.json();
  const structureResponse = await fetch(
    `/api/workflow/${workflow.id}/structure`,
    {
      method: "POST",
      body: JSON.stringify({
        nodes: exampleWorkflow.nodes,
        edges: exampleWorkflow.edges,
      }),
    },
  );
  if (!structureResponse.ok) return toast.error("Error creating workflow");
  return workflow.id as string;
};

export default function WorkflowPage() {
  const t = useTranslations();
  const router = useRouter();

  const { data: workflows, isLoading } = useSWR<WorkflowSummary[]>(
    "/api/workflow",
    fetcher,
    {
      fallbackData: [],
    },
  );

  const createExample = async (exampleWorkflow: {
    workflow: Partial<DBWorkflow>;
    nodes: Partial<DBNode>[];
    edges: Partial<DBEdge>[];
  }) => {
    const workflowId = await createWithExample(exampleWorkflow);
    mutate("/api/workflow");
    router.push(`/workflow/${workflowId}`);
  };

  return (
    <div className="w-full flex flex-col gap-4 p-8">
      <div className="flex flex-row gap-2 items-center">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant={"ghost"} className="relative group">
              What is Workflow?
              <div className="absolute left-0 -top-1.5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                <MousePointer2 className="rotate-180 text-blue-500 fill-blue-500 size-3 wiggle" />
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="md:max-w-3xl!">
            <DialogTitle className="sr-only">workflow greeting</DialogTitle>
            <WorkflowGreeting />
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="min-w-54 justify-between data-[state=open]:bg-input"
            >
              {t("Common.createWithExample")}
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-54">
            <DropdownMenuItem onClick={() => createExample(BabyResearch())}>
              👨🏻‍🔬 {t("Workflow.example.babyResearch")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => createExample(GetWeather())}>
              🌤️ {t("Workflow.example.getWeather")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex w-full flex-col gap-2 mx-auto lg:flex-row lg:flex-wrap">
        <EditWorkflowPopup>
          <Card className="relative bg-secondary overflow-hidden w-full lg:w-sm xl:w-xs hover:bg-input transition-colors h-[196px] cursor-pointer">
            <div className="absolute inset-0 w-full h-full opacity-50">
              <BackgroundPaths />
            </div>
            <CardHeader>
              <CardTitle>
                <h1 className="text-lg font-bold">
                  {t("Workflow.createWorkflow")}
                </h1>
              </CardTitle>
              <CardDescription className="mt-2">
                <p className="">{t("Workflow.createWorkflowDescription")}</p>
              </CardDescription>
              <div className="mt-auto ml-auto flex-1">
                <Button variant="ghost" size="lg">
                  {t("Common.create")}
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
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
          : workflows?.map((workflow) => (
              <Link href={`/workflow/${workflow.id}`} key={workflow.id}>
                <Card className="w-full lg:w-sm xl:w-xs cursor-pointer hover:bg-input transition-colors group">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex flex-col flex-1 min-w-0">
                      <CardTitle className="flex gap-2">
                        <div
                          style={{
                            backgroundColor:
                              workflow.icon?.style?.backgroundColor,
                          }}
                          className="p-2 rounded-lg flex items-center justify-center ring ring-background border"
                        >
                          <Avatar className="size-6">
                            <AvatarImage src={workflow.icon?.value} />
                            <AvatarFallback></AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex flex-col justify-around min-w-0">
                          <span className="truncate h-5">{workflow.name}</span>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {format(workflow.updatedAt, "MMM d, yyyy")}
                            {!workflow.isPublished && (
                              <span className="px-2 rounded-sm bg-secondary text-foreground">
                                {t("Workflow.draft")}
                              </span>
                            )}
                          </p>
                        </div>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto"
                        >
                          <WorkflowContextMenu workflow={workflow}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="transition-opacity data-[state=open]:bg-input!"
                            >
                              <MoreHorizontal />
                            </Button>
                          </WorkflowContextMenu>
                        </div>
                      </CardTitle>
                      <CardDescription className="mt-4 text-xs h-12 line-clamp-3 overflow-hidden whitespace-pre-wrap break-words">
                        {workflow.description}
                      </CardDescription>
                      <div className="flex flex-row gap-2 mt-6">
                        <div className="flex items-center gap-1.5 w-full">
                          <Avatar className="size-4 rounded-full ring ml-auto">
                            <AvatarImage src={workflow.userAvatar} />
                            <AvatarFallback>
                              {workflow.userName.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground font-medium ">
                            {workflow.userName}
                          </span>
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
