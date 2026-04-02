"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, Plug } from "lucide-react";
import { usePlugins } from "@/hooks/queries/use-plugins";
import { PluginList } from "./plugin-list";
import { PluginDetail } from "./plugin-detail";
import type { PluginWithUserState } from "app-types/plugin";

interface CustomizeShellProps {
  activeTab: "skills" | "connectors";
  connectorsContent: React.ReactNode;
}

export function CustomizeShell({
  activeTab,
  connectorsContent,
}: CustomizeShellProps) {
  const router = useRouter();
  const [selectedPlugin, setSelectedPlugin] =
    useState<PluginWithUserState | null>(null);
  const { data: plugins = [], isLoading } = usePlugins();

  const personalPlugins = plugins.filter((p) => p.userId !== null);
  const orgPlugins = plugins.filter(
    (p) => p.userId === null && p.tenantId !== null,
  );

  return (
    <div className="flex h-full">
      {/* Left nav */}
      <div className="w-48 shrink-0 border-r border-border/50 p-3">
        <h2 className="mb-4 text-sm font-semibold">Customize</h2>
        <nav className="flex flex-col gap-1">
          <button
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${activeTab === "skills" ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
            onClick={() => router.push("/customize")}
          >
            <SlidersHorizontal className="size-4" />
            Skills
          </button>
          <button
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${activeTab === "connectors" ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
            onClick={() => router.push("/customize?tab=connectors")}
          >
            <Plug className="size-4" />
            Connectors
          </button>
        </nav>
      </div>

      {activeTab === "connectors" ? (
        <div className="flex-1 overflow-auto">{connectorsContent}</div>
      ) : (
        <>
          <PluginList
            personalPlugins={personalPlugins}
            orgPlugins={orgPlugins}
            isLoading={isLoading}
            selectedId={selectedPlugin?.id ?? null}
            onSelect={setSelectedPlugin}
          />
          <div className="flex-1 overflow-auto border-l border-border/50">
            {selectedPlugin ? (
              <PluginDetail
                plugin={selectedPlugin}
                onClose={() => setSelectedPlugin(null)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a plugin to view details
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
