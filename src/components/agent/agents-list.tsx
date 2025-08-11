"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AgentSummary } from "app-types/agent";
import { Card, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Plus, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { BackgroundPaths } from "ui/background-paths";
import { useBookmark } from "@/hooks/use-bookmark";
import { useInvalidateAgents } from "@/hooks/queries/use-agents";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import { Visibility } from "@/components/shareable-actions";
import { ShareableCard } from "@/components/shareable-card";
import { notify } from "lib/notify";

interface AgentsListProps {
  initialMyAgents: AgentSummary[];
  initialSharedAgents: AgentSummary[];
  userId: string;
}

export function AgentsList({
  initialMyAgents,
  initialSharedAgents,
  userId,
}: AgentsListProps) {
  const t = useTranslations();
  const router = useRouter();
  const invalidateAgents = useInvalidateAgents();

  const { data: allAgents, mutate: mutateAgents } = useSWR(
    "/api/agent?filters=mine,shared",
    fetcher,
    {
      fallbackData: [...initialMyAgents, ...initialSharedAgents],
    },
  );

  const myAgents =
    allAgents?.filter((agent: AgentSummary) => agent.userId === userId) ||
    initialMyAgents;

  const sharedAgents =
    allAgents?.filter((agent: AgentSummary) => agent.userId !== userId) ||
    initialSharedAgents;

  const { toggleBookmark: toggleBookmarkHook } = useBookmark({
    itemType: "agent",
  });

  const toggleBookmark = async (agentId: string, isBookmarked: boolean) => {
    await toggleBookmarkHook({ id: agentId, isBookmarked });
  };

  const updateVisibility = async (agentId: string, visibility: Visibility) => {
    try {
      const response = await fetch(`/api/agent/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });

      if (!response.ok) throw new Error("Failed to update visibility");

      mutateAgents();
      invalidateAgents();
      router.refresh();
      toast.success(t("Agent.visibilityUpdated"));
    } catch {
      toast.error(t("Common.error"));
    }
  };

  const deleteAgent = async (agentId: string) => {
    const ok = await notify.confirm({
      description: t("Agent.deleteConfirm"),
    });
    if (!ok) return;

    try {
      const response = await fetch(`/api/agent/${agentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete agent");

      mutateAgents();
      invalidateAgents();
      router.refresh();
      toast.success(t("Agent.deleted"));
    } catch {
      toast.error(t("Common.error"));
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Layout.agents")}</h1>
        <Link href="/agent/new">
          <Button variant="ghost">
            <Plus />
            {t("Agent.newAgent")}
          </Button>
        </Link>
      </div>

      {/* My Agents Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("Agent.myAgents")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/agent/new">
            <Card className="relative bg-secondary overflow-hidden cursor-pointer hover:bg-input transition-colors h-[196px]">
              <div className="absolute inset-0 w-full h-full opacity-50">
                <BackgroundPaths />
              </div>
              <CardHeader>
                <CardTitle>
                  <h1 className="text-lg font-bold">{t("Agent.newAgent")}</h1>
                </CardTitle>
                <CardDescription className="mt-2">
                  <p>{t("Layout.createYourOwnAgent")}</p>
                </CardDescription>
                <div className="mt-auto ml-auto flex-1">
                  <Button variant="ghost" size="lg">
                    {t("Common.create")}
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {myAgents.map((agent) => (
            <ShareableCard
              key={agent.id}
              type="agent"
              item={agent}
              href={`/agent/${agent.id}`}
              onVisibilityChange={updateVisibility}
              onDelete={deleteAgent}
            />
          ))}
        </div>
      </div>

      {/* Shared Agents Section */}
      <div className="flex flex-col gap-4 mt-8">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("Agent.sharedAgents")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sharedAgents.map((agent) => (
            <ShareableCard
              key={agent.id}
              type="agent"
              item={agent}
              isOwner={false}
              href={`/agent/${agent.id}`}
              onBookmarkToggle={toggleBookmark}
            />
          ))}
          {sharedAgents.length === 0 && (
            <Card className="col-span-full bg-transparent border-none">
              <CardHeader className="text-center py-12">
                <CardTitle>{t("Agent.noSharedAgents")}</CardTitle>
                <CardDescription>
                  {t("Agent.noSharedAgentsDescription")}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
