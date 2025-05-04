import MCPEditor from "@/components/mcp-editor";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="container max-w-3xl mx-4 md:mx-auto py-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/mcp"
          className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-3" />
          Back
        </Link>
        <header>
          <h2 className="text-3xl font-semibold my-2">MCP Configuration</h2>
          <p className="text text-muted-foreground">
            Configure your MCP server connection settings
          </p>
        </header>

        <main className="my-8">
          <MCPEditor />
        </main>
      </div>
    </div>
  );
}
