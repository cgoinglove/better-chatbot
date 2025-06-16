import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "ui/card";

export default function WorkflowPage() {
  return (
    <div className="w-full flex flex-col gap-4 p-8">
      <Card className="w-sm hover:bg-input transition-colors">
        <Link href="/workflow/1">
          <CardHeader>
            <CardTitle>
              <h1 className="text-lg font-bold">Create Workflow</h1>
            </CardTitle>
            <CardDescription className="mt-2">
              <p className="flex items-center gap-2">
                Create a workflow to automate{" "}
                <span className="text-foreground">your tasks.</span>
                <ArrowUpRight className="size-3.5" />
              </p>
            </CardDescription>
          </CardHeader>
        </Link>
      </Card>
    </div>
  );
}
