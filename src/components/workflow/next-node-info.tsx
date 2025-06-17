import { Edge } from "@xyflow/react";
import { UINode } from "lib/ai/workflow/interface";
import { useMemo } from "react";
import { Label } from "ui/label";
import { NodeIcon } from "./node-icon";
import { Button } from "ui/button";
import { PlusIcon, Unlink } from "lucide-react";

interface NextNodeInfoProps {
  node: UINode;
  nodes: UINode[];
  edges: Edge[];
  onSelectNode(nodeId: string): void;
  onDisconnected(nodeId: string): void;
}

export function NextNodeInfo({
  node,
  nodes,
  edges,
  onDisconnected,
  onSelectNode,
}: NextNodeInfoProps) {
  const nextNodes = useMemo(() => {
    const nextIds = edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => edge.target);
    return nodes.filter((node) => nextIds.includes(node.id));
  }, [edges, node.id]);

  return (
    <div className="flex flex-col w-full text-muted-foreground">
      <Label>Next Step</Label>
      <p className="my-2 text-xs">이 워크플로우에 다음 단계를 추가하세요.</p>
      <div className="flex w-full">
        <div>
          <div className="border p-2 rounded-lg flex items-center">
            <NodeIcon type={node.data.kind} />
            <div className=""></div>
          </div>
        </div>

        <div className="text-xs flex-1 min-w-0 gap-1 bg-background rounded-lg p-0.5 flex flex-col">
          {nextNodes.map((n) => {
            return (
              <div
                className="w-full group cursor-pointer hover:bg-secondary transition-colors gap-2 border p-2 rounded-lg bg-card flex items-center"
                key={n.data.id}
                onClick={onSelectNode?.bind(null, n.data.id)}
              >
                <NodeIcon type={n.data.kind} />
                {n.data.name}
                <button
                  className=" hover:bg-input opacity-0 flex group-hover:opacity-100 transition-opacity ml-auto gap-1 border rounded  px-2 py-1 items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisconnected(n.data.id);
                  }}
                >
                  <Unlink className="size-3" />
                  UnLink
                </button>
              </div>
            );
          })}
          <Button
            size={"lg"}
            variant="ghost"
            className="text-xs w-full text-muted-foreground border border-dashed justify-start"
          >
            <PlusIcon className="size-3" />
            <span>Add Next Step</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
