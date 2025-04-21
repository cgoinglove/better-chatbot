import { CanvasEditor } from "@/components/canvas/canvas-editor";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CanvasEditorPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="container max-w-full mx-4 md:mx-auto py-4">
      <div className="flex flex-col gap-2">
        <Link
          href="/canvas"
          className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="size-3" />
          Back to Canvas List
        </Link>
        <header>
          <h2 className="text-2xl font-semibold my-2">Canvas Editor</h2>
          <p className="text text-muted-foreground">
            Collaborate with AI to create and edit content
          </p>
        </header>
        <Separator className="h-1 w-full mt-2" />
        <main className="my-4 flex-1">
          <CanvasEditor canvasId={params.id} />
        </main>
      </div>
    </div>
  );
}
