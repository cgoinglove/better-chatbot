import { CanvasList } from "@/components/canvas/canvas-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { generateUUID } from "@/lib/utils";

export default function CanvasPage() {
  const newCanvasId = generateUUID();
  
  return (
    <div className="container max-w-5xl mx-4 md:mx-auto py-8">
      <div className="flex flex-col gap-2">
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-semibold my-2">Canvas</h2>
            <p className="text text-muted-foreground">
              Real-time editing interface for LLM + user collaboration
            </p>
          </div>
          <Link href={`/canvas/${newCanvasId}`}>
            <Button
              className="border-dashed border-foreground/20 font-semibold"
              variant="outline"
            >
              <Plus className="stroke-2" />
              New Canvas
            </Button>
          </Link>
        </header>
        <main className="my-8">
          <CanvasList />
        </main>
      </div>
    </div>
  );
}
