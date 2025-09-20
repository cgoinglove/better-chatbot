"use client";
import { EditWorkflowPopup } from "@/components/workflow/edit-workflow-popup";
import { authClient } from "auth/client";
import { canCreateWorkflow } from "lib/auth/client-permissions";

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
import { useState } from "react";

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

interface WorkflowListPageProps {
  userRole?: string | null;
}

export default function WorkflowListPage({
  userRole,
}: WorkflowListPageProps = {}) {
  const t = useTranslations();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const [isVisibilityChangeLoading, setIsVisibilityChangeLoading] =
    useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

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
      setIsVisibilityChangeLoading(true);
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
    } finally {
      setIsVisibilityChangeLoading(false);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    const ok = await notify.confirm({
      description: t("Workflow.deleteConfirm"),
    });
    if (!ok) return;

    try {
      setIsDeleteLoading(true);
      const response = await fetch(`/api/workflow/${workflowId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete workflow");

      mutate("/api/workflow");
      toast.success(t("Workflow.deleted"));
    } catch (_error) {
      toast.error(t("Common.error"));
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // Check if user can create workflows using Better Auth permissions
  const canCreate = canCreateWorkflow(userRole);

  // For regular users, combine all workflows into one list
  const displayWorkflows = canCreate
    ? myWorkflows
    : [...myWorkflows, ...sharedWorkflows];

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

        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="min-w-54 justify-between data-[state=open]:bg-input"
                data-testid="create-workflow-with-example-button"
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
        )}
      </div>

      {/* My Workflows / Available Workflows Section */}
      {(canCreate || displayWorkflows.length > 0) && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {canCreate
                ? t("Workflow.myWorkflows")
                : t("Workflow.availableWorkflows")}
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {canCreate && (
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
                      <p className="">
                        {t("Workflow.createWorkflowDescription")}
                      </p>
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
            )}
            {isLoading
              ? Array(6)
                  .fill(null)
                  .map((_, index) => (
                    <Skeleton key={index} className="w-full h-[196px]" />
                  ))
              : displayWorkflows?.map((workflow) => (
                  <ShareableCard
                    key={workflow.id}
                    type="workflow"
                    item={workflow}
                    href={`/workflow/${workflow.id}`}
                    onVisibilityChange={
                      canCreate && workflow.userId === currentUserId
                        ? updateVisibility
                        : undefined
                    }
                    onDelete={
                      canCreate && workflow.userId === currentUserId
                        ? deleteWorkflow
                        : undefined
                    }
                    isVisibilityChangeLoading={isVisibilityChangeLoading}
                    isDeleteLoading={isDeleteLoading}
                    isOwner={workflow.userId === currentUserId}
                  />
                ))}
          </div>
        </div>
      )}

      {/* Only show Shared Workflows section for users who can create (to differentiate between owned and shared) */}
      {canCreate && sharedWorkflows.length > 0 && (
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

      {/* Empty state for users without create permission and no available workflows */}
      {!canCreate && displayWorkflows.length === 0 && !isLoading && (
        <Card className="col-span-full bg-transparent border-none">
          <CardHeader className="text-center py-12">
            <CardTitle>{t("Workflow.noAvailableWorkflows")}</CardTitle>
            <CardDescription>
              {t("Workflow.noAvailableWorkflowsDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
