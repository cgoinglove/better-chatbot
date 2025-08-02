import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";

export function MCPOverview() {
  const t = useTranslations("MCP");

  return (
    <Link
      href="/mcp/create"
      className="rounded-lg hover:bg-secondary/50 overflow-hidden cursor-pointer p-12 text-center relative group transition-all duration-300  hover:border-foreground/40"
    >
      {/* <GradientBars /> */}
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
    </Link>
  );
}
