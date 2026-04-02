"use client";

import { useState } from "react";
import { X, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import type { PluginWithUserState } from "app-types/plugin";

interface PluginSelectorProps {
  plugins: PluginWithUserState[];
  activePlugin: PluginWithUserState | null;
  onPluginChange: (plugin: PluginWithUserState | null) => void;
  onSkillSelect: (prompt: string) => void;
}

const MAX_VISIBLE_CHIPS = 4;

export function PluginSelector({
  plugins,
  activePlugin,
  onPluginChange,
  onSkillSelect,
}: PluginSelectorProps) {
  const [open, setOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const visibleSkills = activePlugin?.skills.slice(0, MAX_VISIBLE_CHIPS) ?? [];
  const overflowCount = (activePlugin?.skills.length ?? 0) - MAX_VISIBLE_CHIPS;

  return (
    <div className="flex flex-col gap-1 px-3 py-1">
      <div className="flex items-center gap-2">
        {activePlugin ? (
          <div className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
            <span>{activePlugin.name}</span>
            <button
              onClick={() => onPluginChange(null)}
              className="ml-1 hover:text-blue-200"
              aria-label="Remove plugin"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : null}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground"
            >
              <Sparkles className="size-3" />
              {activePlugin ? "Change" : "+ Plugin"}
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            {plugins.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No plugins available
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {activePlugin && (
                  <button
                    className="rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
                    onClick={() => {
                      onPluginChange(null);
                      setOpen(false);
                    }}
                  >
                    None
                  </button>
                )}
                {plugins.map((p) => (
                  <button
                    key={p.id}
                    className="rounded px-2 py-1 text-left text-xs hover:bg-accent"
                    onClick={() => {
                      onPluginChange(p);
                      setOpen(false);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {activePlugin && visibleSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleSkills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => onSkillSelect(skill.prompt)}
              className="rounded border border-border/50 bg-muted/30 px-2 py-0.5 text-xs hover:bg-muted/60"
              title={skill.longDescription}
            >
              {skill.name}
            </button>
          ))}
          {overflowCount > 0 && (
            <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
              <PopoverTrigger asChild>
                <button className="rounded border border-border/50 bg-muted/30 px-2 py-0.5 text-xs hover:bg-muted/60">
                  +{overflowCount} more
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-1">
                {activePlugin.skills.slice(MAX_VISIBLE_CHIPS).map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      onSkillSelect(skill.prompt);
                      setOverflowOpen(false);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
                  >
                    {skill.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
}
