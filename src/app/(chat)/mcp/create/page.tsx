"use client";

import MCPEditor from "@/components/mcp-editor";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RECOMMENDED_MCPS } from "@/components/mcp-overview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

export default function Page() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [initialConfig, setInitialConfig] = useState<any>();
  const [initialName, setInitialName] = useState<string>();

  // Get 4 random icons for display
  const displayIcons = useMemo(() => {
    const shuffled = [...RECOMMENDED_MCPS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, []);

  useEffect(() => {
    const name = searchParams.get("name");
    const config = searchParams.get("config");

    if (name && config) {
      try {
        setInitialConfig(JSON.parse(config));
        setInitialName(name);
      } catch (e) {
        console.error("Failed to parse config from URL params", e);
      }
    }
  }, [searchParams]);

  const handleRecommendedSelect = (mcp: (typeof RECOMMENDED_MCPS)[number]) => {
    const params = new URLSearchParams();
    params.set("name", mcp.name);
    params.set("config", JSON.stringify(mcp.config));
    router.push(`/mcp/create?${params.toString()}`);
  };

  return (
    <div className="container max-w-3xl mx-0 px-4 sm:mx-4 md:mx-auto py-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/mcp"
          className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-3" />
          {t("Common.back")}
        </Link>
        <header className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-semibold my-2">
              {t("MCP.mcpConfiguration")}
            </h2>
            <p className="text text-muted-foreground">
              {t("MCP.configureYourMcpServerConnectionSettings")}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-1 data-[state=open]:bg-muted data-[state=open]:text-foreground text-muted-foreground"
              >
                <div className="flex -space-x-2">
                  {displayIcons.map((mcp, index) => {
                    const Icon = mcp.icon;
                    return (
                      <div
                        key={mcp.name}
                        className="relative rounded-full bg-background border-[1px] p-1"
                        style={{
                          zIndex: displayIcons.length - index,
                        }}
                      >
                        <Icon className="size-3" />
                      </div>
                    );
                  })}
                </div>
                Recommended
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {RECOMMENDED_MCPS.map((mcp) => {
                const Icon = mcp.icon;
                return (
                  <DropdownMenuItem
                    key={mcp.name}
                    onClick={() => handleRecommendedSelect(mcp)}
                    className="cursor-pointer"
                  >
                    <Icon className="size-4 mr-2" />
                    <span>{mcp.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="my-8">
          <MCPEditor
            key={`${initialName}-${JSON.stringify(initialConfig)}`}
            initialConfig={initialConfig}
            name={initialName}
          />
        </main>
      </div>
    </div>
  );
}
