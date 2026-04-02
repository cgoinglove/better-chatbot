"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "ui/button";
import { Textarea } from "ui/textarea";
import { Badge } from "ui/badge";
import type { PluginWithUserState } from "app-types/plugin";
import { useUpdatePlugin, useDeletePlugin } from "@/hooks/queries/use-plugins";

interface PluginDetailProps {
  plugin: PluginWithUserState;
  onClose: () => void;
}

export function PluginDetail({ plugin, onClose }: PluginDetailProps) {
  const [systemPrompt, setSystemPrompt] = useState(
    plugin.userState?.customSystemPrompt ?? plugin.systemPromptAddition,
  );
  const updatePlugin = useUpdatePlugin();
  const deletePlugin = useDeletePlugin();
  const isPersonal = plugin.userId !== null;

  const handleSavePrompt = () => {
    if (isPersonal) {
      updatePlugin({
        id: plugin.id,
        data: { systemPromptAddition: systemPrompt },
      });
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-semibold">{plugin.name}</h2>
          <p className="text-sm text-muted-foreground">{plugin.description}</p>
          <div className="mt-1 flex gap-2">
            <Badge variant="outline">{plugin.category}</Badge>
            {plugin.isBuiltIn && <Badge variant="secondary">Built-in</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {isPersonal && !plugin.isBuiltIn && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => {
                deletePlugin(plugin.id);
                onClose();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
          System Prompt
        </label>
        <Textarea
          value={systemPrompt ?? ""}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          disabled={!isPersonal}
          className="text-sm"
        />
        {isPersonal && (
          <Button size="sm" className="mt-2" onClick={handleSavePrompt}>
            Save
          </Button>
        )}
      </div>

      {plugin.skills.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
            Skills
          </label>
          <div className="space-y-2">
            {plugin.skills.map((skill) => (
              <div
                key={skill.id}
                className="rounded border border-border/50 p-2"
              >
                <p className="text-sm font-medium">{skill.name}</p>
                <p className="text-xs text-muted-foreground">
                  {skill.longDescription}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {plugin.commands.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
            Commands
          </label>
          <div className="space-y-1">
            {plugin.commands.map((cmd) => (
              <div key={cmd.id} className="flex items-center gap-2 text-sm">
                <code className="rounded bg-muted px-1 text-xs">
                  /{cmd.slug}
                </code>
                <span className="text-muted-foreground">{cmd.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
