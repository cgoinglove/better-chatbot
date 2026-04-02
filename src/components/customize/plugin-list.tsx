"use client";

import { Plus } from "lucide-react";
import { Button } from "ui/button";
import { Skeleton } from "ui/skeleton";
import { Switch } from "ui/switch";
import type { PluginWithUserState } from "app-types/plugin";
import {
  useEnablePlugin,
  useDisablePlugin,
  useCreatePlugin,
} from "@/hooks/queries/use-plugins";

interface PluginListProps {
  personalPlugins: PluginWithUserState[];
  orgPlugins: PluginWithUserState[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (plugin: PluginWithUserState) => void;
}

function PluginRow({
  plugin,
  isSelected,
  onSelect,
}: {
  plugin: PluginWithUserState;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const enable = useEnablePlugin();
  const disable = useDisablePlugin();
  const isEnabled = plugin.userState?.enabled ?? false;

  return (
    <div
      className={`flex cursor-pointer items-center justify-between rounded px-2 py-1.5 ${isSelected ? "bg-accent" : "hover:bg-accent/50"}`}
      onClick={onSelect}
    >
      <span className="truncate text-sm">{plugin.name}</span>
      <Switch
        checked={isEnabled}
        onCheckedChange={(checked) => {
          checked ? enable(plugin.id) : disable(plugin.id);
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Toggle ${plugin.name}`}
      />
    </div>
  );
}

export function PluginList({
  personalPlugins,
  orgPlugins,
  isLoading,
  selectedId,
  onSelect,
}: PluginListProps) {
  const createPlugin = useCreatePlugin();

  if (isLoading) {
    return (
      <div className="w-56 shrink-0 space-y-2 border-r border-border/50 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-56 shrink-0 overflow-y-auto border-r border-border/50 p-3">
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Personal
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            title="Add personal plugin"
            onClick={() =>
              createPlugin({
                name: "New Plugin",
                description: "",
                category: "custom",
                icon: "Sparkles",
                color: "bg-blue-500/10 text-blue-500",
                systemPromptAddition: "",
                skills: [],
                commands: [],
                isPublic: false,
                version: "1.0.0",
              })
            }
          >
            <Plus className="size-3" />
          </Button>
        </div>
        {personalPlugins.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">
            No personal plugins yet
          </p>
        ) : (
          personalPlugins.map((p) => (
            <PluginRow
              key={p.id}
              plugin={p}
              isSelected={selectedId === p.id}
              onSelect={() => onSelect(p)}
            />
          ))
        )}
      </div>

      {orgPlugins.length > 0 && (
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
            Org Plugins
          </span>
          {orgPlugins.map((p) => (
            <PluginRow
              key={p.id}
              plugin={p}
              isSelected={selectedId === p.id}
              onSelect={() => onSelect(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
