"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/shallow";
import { toast } from "sonner";
import { X, Plus, ArrowUpRight, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerPortal,
  DrawerTitle,
} from "ui/drawer";
import { Button } from "ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Avatar, AvatarImage } from "ui/avatar";
import { appStore } from "@/app/store";
import {
  PRESET_AGENTS,
  type PresetCategory,
  type PresetAgent,
} from "lib/ai/agent/presets";
import type { AgentSummary } from "app-types/agent";
import { fetcher } from "lib/utils";
import useSWR from "swr";

const CATEGORIES: PresetCategory[] = ["Sales", "Marketing", "Admin", "Finance"];

// ── Individual preset card ─────────────────────────────────────────────────

function PresetCard({
  preset,
  presetIdToAgentId,
  onAdded,
}: {
  preset: PresetAgent;
  presetIdToAgentId: Map<string, string>;
  onAdded: (presetId: string, agentId: string) => void;
}) {
  const router = useRouter();
  const appStoreMutate = appStore(useShallow((state) => state.mutate));
  const [isLoading, setIsLoading] = useState(false);
  const agentId = presetIdToAgentId.get(preset.presetId);
  const isOwned = !!agentId;

  const handleAdd = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent/from-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: preset.presetId }),
      });
      if (!res.ok) throw new Error("Failed to add agent");
      const { agentId: newAgentId } = await res.json();
      onAdded(preset.presetId, newAgentId);
      toast.success(`${preset.name} added to your agents`);
    } catch {
      toast.error("Failed to add agent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    if (agentId) {
      appStoreMutate({ openAgentLibrary: false });
      router.push(`/agent/${agentId}`);
    }
  };

  return (
    <Card className="flex flex-col h-full hover:border-primary/40 transition-colors">
      <CardHeader className="shrink gap-y-0 pb-3">
        <CardTitle className="flex gap-3 items-center min-w-0">
          <div
            style={{ backgroundColor: preset.icon?.style?.backgroundColor }}
            className="p-2 rounded-lg flex items-center justify-center ring ring-background border shrink-0"
          >
            <Avatar className="size-6">
              <AvatarImage src={preset.icon?.value} />
            </Avatar>
          </div>
          <span className="truncate font-medium text-sm">{preset.name}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="grow flex flex-col gap-4 pt-0">
        <CardDescription className="text-xs line-clamp-3 break-words">
          {preset.description}
        </CardDescription>

        <div className="mt-auto">
          {isOwned ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs gap-1"
              onClick={handleOpen}
            >
              Open
              <ArrowUpRight className="size-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs gap-1"
              disabled={isLoading}
              onClick={handleAdd}
            >
              {isLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <>
                  <Plus className="size-3" />
                  Add to my agents
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Category grid ──────────────────────────────────────────────────────────

function CategoryGrid({
  category,
  presetIdToAgentId,
  onAdded,
}: {
  category: PresetCategory;
  presetIdToAgentId: Map<string, string>;
  onAdded: (presetId: string, agentId: string) => void;
}) {
  const presets = PRESET_AGENTS.filter((p) => p.category === category);

  if (presets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <p className="text-sm">No agents in this category yet.</p>
        <p className="text-xs">Check back soon — more are on the way.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {presets.map((preset) => (
        <PresetCard
          key={preset.presetId}
          preset={preset}
          presetIdToAgentId={presetIdToAgentId}
          onAdded={onAdded}
        />
      ))}
    </div>
  );
}

// ── Drawer ─────────────────────────────────────────────────────────────────

export function AgentLibraryDrawer() {
  const [open, appStoreMutate] = appStore(
    useShallow((state) => [state.openAgentLibrary, state.mutate]),
  );

  const { data: myAgents, mutate: mutateAgents } = useSWR<AgentSummary[]>(
    open ? "/api/agent?filters=mine" : null,
    fetcher,
  );

  // Build a map of presetId -> agentId from the user's existing agents
  const serverMap = new Map(
    (myAgents ?? [])
      .filter((a): a is AgentSummary & { presetId: string } => !!a.presetId)
      .map((a) => [a.presetId, a.id]),
  );

  // Track locally added presets so the UI updates instantly without a full refetch
  const [locallyAdded, setLocallyAdded] = useState<Map<string, string>>(
    new Map(),
  );
  const presetIdToAgentId = new Map([...serverMap, ...locallyAdded]);

  const handleAdded = (presetId: string, agentId: string) => {
    setLocallyAdded((prev) => new Map([...prev, [presetId, agentId]]));
    mutateAgents();
  };

  const handleClose = () => {
    appStoreMutate({ openAgentLibrary: false });
    setLocallyAdded(new Map());
  };

  return (
    <Drawer
      handleOnly
      open={open}
      direction="top"
      onOpenChange={(isOpen) => {
        appStoreMutate({ openAgentLibrary: isOpen });
        if (!isOpen) setLocallyAdded(new Map());
      }}
    >
      <DrawerPortal>
        <DrawerContent
          style={{ userSelect: "text" }}
          className="max-h-[100vh]! w-full h-full rounded-none flex flex-col overflow-hidden p-4 md:p-6"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Agent Library</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pre-built agents ready to add to your workspace
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              aria-label="Close library"
            >
              <X />
            </Button>
          </div>

          <DrawerTitle className="sr-only">Agent Library</DrawerTitle>
          <DrawerDescription className="sr-only" />

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs defaultValue="Sales" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-fit mb-6">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                {CATEGORIES.map((cat) => (
                  <TabsContent key={cat} value={cat} className="mt-0">
                    <CategoryGrid
                      category={cat}
                      presetIdToAgentId={presetIdToAgentId}
                      onAdded={handleAdded}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
