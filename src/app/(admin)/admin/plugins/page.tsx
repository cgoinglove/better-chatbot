"use client";

import { usePlugins, useDeletePlugin } from "@/hooks/queries/use-plugins";
import { Button } from "ui/button";
import { Badge } from "ui/badge";

export default function AdminPluginsPage() {
  const { data: plugins = [], isLoading } = usePlugins();
  const deletePlugin = useDeletePlugin();

  const handleSeed = async () => {
    const { DEFAULT_PLUGINS } = await import("@/lib/plugins/seed-data");
    await fetch("/api/plugins/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plugins: DEFAULT_PLUGINS }),
    });
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Plugins</h1>
        <Button onClick={handleSeed} variant="outline" size="sm">
          Seed Default Plugins
        </Button>
      </div>
      <div className="space-y-2">
        {plugins.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded border border-border p-3"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-1 flex gap-2">
                <Badge variant="outline">{p.category}</Badge>
                {p.isBuiltIn && <Badge variant="secondary">Built-in</Badge>}
                {p.isPublic && <Badge>Public</Badge>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => deletePlugin(p.id)}
            >
              Delete
            </Button>
          </div>
        ))}
        {plugins.length === 0 && (
          <p className="text-muted-foreground">
            No plugins. Click &quot;Seed Default Plugins&quot; to load defaults.
          </p>
        )}
      </div>
    </div>
  );
}
