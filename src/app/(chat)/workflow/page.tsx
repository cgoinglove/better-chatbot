"use client";
import { EditWorkflowPopup } from "@/components/workflow/edit-workflow-popup";
import { authClient } from "auth/client";

import { ArrowUpRight, ChevronDown, MousePointer2 } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import useSWR, { mutate } from "swr";
import { fetcher } from "lib/utils";
import { Skeleton } from "ui/skeleton";
import { BackgroundPaths } from "ui/background-paths";
import { ShareableCard } from "@/components/shareable-card";
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
import { notify } from "lib/notify";

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
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const { data: workflows, isLoading } = useSWR<WorkflowSummary[]>(
    "/api/workflow",
    fetcher,
    {
      fallbackData: [],
    },
  );

  // Separate workflows into user's own and shared
  const myWorkflows =
    workflows?.filter((w) => w.userId === currentUserId) || [];
  const sharedWorkflows =
    workflows?.filter((w) => w.userId !== currentUserId) || [];

  const createExample = async (exampleWorkflow: {
    workflow: Partial<DBWorkflow>;
    nodes: Partial<DBNode>[];
    edges: Partial<DBEdge>[];
  }) => {
    const workflowId = await createWithExample(exampleWorkflow);
    mutate("/api/workflow");
    router.push(`/workflow/${workflowId}`);
  };

  const updateVisibility = async (
    workflowId: string,
    visibility: "private" | "public" | "readonly",
  ) => {
    try {
      const response = await fetch(`/api/workflow/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });

      if (!response.ok) throw new Error("Failed to update visibility");

      // Refresh the workflows data
      mutate("/api/workflow");
      toast.success(t("Workflow.visibilityUpdated"));
    } catch {
      toast.error(t("Common.error"));
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    const ok = await notify.confirm({
      description: t("Workflow.deleteConfirm"),
    });
    if (!ok) return;

    try {
      const response = await fetch(`/api/workflow/${workflowId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete workflow");

      mutate("/api/workflow");
      toast.success(t("Workflow.deleted"));
    } catch (_error) {
      toast.error(t("Common.error"));
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 p-8">
      <div className="flex flex-row gap-2 items-center">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant={"ghost"} className="relative group">
              {t("Workflow.whatIsWorkflow")}
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

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("Workflow.myWorkflows")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <EditWorkflowPopup>
            <Card className="relative bg-secondary overflow-hidden w-full hover:bg-input transition-colors h-[196px] cursor-pointer">
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
            ? Array(6)
                .fill(null)
                .map((_, index) => (
                  <Skeleton key={index} className="w-full h-[196px]" />
                ))
            : myWorkflows?.map((workflow) => (
                <ShareableCard
                  key={workflow.id}
                  type="workflow"
                  item={workflow}
                  href={`/workflow/${workflow.id}`}
                  onVisibilityChange={updateVisibility}
                  onDelete={deleteWorkflow}
                />
              ))}
        </div>
      </div>

      {sharedWorkflows.length > 0 && (
        <div className="flex flex-col gap-4 mt-8">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {t("Workflow.sharedWorkflows")}
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedWorkflows?.map((workflow) => (
              <ShareableCard
                key={workflow.id}
                type="workflow"
                item={workflow}
                isOwner={false}
                href={`/workflow/${workflow.id}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
