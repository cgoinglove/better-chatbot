"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";

import { NotionIcon } from "ui/notion-icon";
import { LinearIcon } from "ui/linear-icon";
import { PlaywrightIcon } from "ui/playwright-icon";
import { NeonIcon } from "ui/neon-icon";
import { StripeIcon } from "ui/stripe-icon";
import { CanvaIcon } from "ui/canva-icon";
import { PaypalIcon } from "ui/paypal-icon";
import { Button } from "ui/button";
import { AtlassianIcon } from "ui/atlassian-icon";
import { AsanaIcon } from "ui/asana-icon";
import { GithubIcon } from "ui/github-icon";

export const RECOMMENDED_MCPS = [
  {
    name: "github",
    label: "GitHub",
    config: {
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        Authorization: "Bearer ${input:your_github_mcp_pat}",
      },
    },
    icon: GithubIcon,
  },
  {
    name: "notion",
    label: "Notion",
    config: {
      url: "https://mcp.notion.com/mcp",
    },
    icon: NotionIcon,
  },

  {
    name: "linear",
    label: "Linear",
    config: {
      url: "https://mcp.linear.app/sse",
    },
    icon: LinearIcon,
  },
  {
    name: "playwright",
    label: "Playwright",
    config: {
      command: "npx",
      args: ["@playwright/mcp@latest"],
    },
    icon: PlaywrightIcon,
  },
  {
    name: "neon",
    label: "Neon",
    config: {
      url: "https://mcp.neon.tech/mcp",
    },
    icon: NeonIcon,
  },
  {
    name: "paypal",
    label: "Paypal",
    config: {
      url: "https://mcp.paypal.com/mcp",
    },
    icon: PaypalIcon,
  },
  {
    name: "stripe",
    label: "Stripe",
    config: {
      url: "https://mcp.stripe.com",
    },
    icon: StripeIcon,
  },
  {
    name: "canva",
    label: "Canva",
    config: {
      url: "https://mcp.canva.com/mcp",
    },
    icon: CanvaIcon,
  },
  {
    name: "atlassian",
    label: "Atlassian",
    icon: AtlassianIcon,
    config: {
      url: "https://mcp.atlassian.com/v1/sse",
    },
  },
  {
    name: "asana",
    label: "Asana",
    icon: AsanaIcon,
    config: {
      url: "https://mcp.asana.com/sse",
    },
  },
];

export function MCPOverview() {
  const t = useTranslations("MCP");

  const handleMcpClick = (
    e: React.MouseEvent,
    mcp: (typeof RECOMMENDED_MCPS)[number],
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const params = new URLSearchParams();
    params.set("name", mcp.name);
    params.set("config", JSON.stringify(mcp.config));

    window.location.href = `/mcp/create?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/mcp/create"
        className="rounded-lg overflow-hidden cursor-pointer p-12 text-center relative group transition-all duration-300 "
      >
        <div className="flex flex-col items-center justify-center space-y-4 my-20">
          <h3 className="text-2xl md:text-4xl font-semibold flex items-center gap-3">
            <MCPIcon className="fill-foreground size-6 hidden sm:block" />
            {t("overviewTitle")}
          </h3>

          <p className="text-muted-foreground max-w-md">
            {t("overviewDescription")}
          </p>

          <div className="flex items-center gap-2 text-xl font-bold">
            {t("addMcpServer")}
            <ArrowUpRight className="size-6" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {RECOMMENDED_MCPS.map((mcp) => (
            <Button
              key={mcp.name}
              variant={"secondary"}
              className="hover:translate-y-[-2px] transition-all duration-300"
              onClick={(e) => handleMcpClick(e, mcp)}
            >
              <mcp.icon />
              {mcp.label}
            </Button>
          ))}
        </div>
      </Link>
    </div>
  );
}
