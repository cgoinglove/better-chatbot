"use client";

import { deleteCanvasAction, selectCanvasesByUserIdAction } from "@/app/api/canvas/actions";
import { appStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateUUID } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";

export function CanvasList() {
  const [isLoading, setIsLoading] = useState(true);
  const [canvases, storeMutate] = appStore(
    useShallow((state) => [state.canvasList, state.mutate])
  );

  // Load canvases from database
  useEffect(() => {
    const loadCanvases = async () => {
      try {
        const canvasList = await selectCanvasesByUserIdAction();
        storeMutate({ canvasList });
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load canvases:", error);
        toast.error("Failed to load canvases");
        setIsLoading(false);
      }
    };

    loadCanvases();
  }, [storeMutate]);

  const handleDelete = async (id: string) => {
    try {
      await deleteCanvasAction(id);
      storeMutate({ canvasList: canvases.filter(canvas => canvas.id !== id) });
      toast.success("Canvas deleted");
    } catch (error) {
      console.error("Failed to delete canvas:", error);
      toast.error("Failed to delete canvas");
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="flex-1">
              <Skeleton className="h-24 w-full" />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (canvases.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">No canvases found</p>
        <Link href={`/canvas/${generateUUID()}`}>
          <Button>Create your first canvas</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {canvases.map((canvas) => (
        <Card key={canvas.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{canvas.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="line-clamp-3 text-muted-foreground">
              {canvas.content.replace(/[#*`]/g, '')}
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              Updated {formatDistanceToNow(canvas.updatedAt)} ago
            </p>
            <div className="flex gap-2">
              <Link href={`/canvas/${canvas.id}`}>
                <Button size="icon" variant="outline">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="icon"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(canvas.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
