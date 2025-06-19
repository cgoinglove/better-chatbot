"use client";

import { useReactFlow } from "@xyflow/react";
import { NodeKind, WorkflowNode } from "lib/ai/workflow/interface";
import { Trash2Icon } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

export function NodeContextMenuContent({
  node,
}: {
  node: WorkflowNode;
}) {
  const { setEdges, setNodes } = useReactFlow();

  const handleDeleteNode = useCallback(() => {
    if (node.kind === NodeKind.Start) {
      return toast.warning("Start node cannot be deleted");
    }
    setEdges((edges) =>
      edges.filter(
        (edge) => edge.source !== node.id && edge.target !== node.id,
      ),
    );
    setNodes((nodes) => nodes.filter((v) => v.id !== node.id));
  }, [node.id]);

  return (
    <div className="w-full flex flex-col gap-2 min-w-40 text-sm">
      <div
        onClick={handleDeleteNode}
        className="flex items-center p-2 gap-2 cursor-pointer rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
      >
        <Trash2Icon className="size-3" />
        Delete
      </div>
    </div>
  );
}
