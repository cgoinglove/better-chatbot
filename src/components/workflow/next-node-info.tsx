import { Edge, useReactFlow } from "@xyflow/react";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { useCallback, useMemo } from "react";
import { Label } from "ui/label";
import { NodeIcon } from "./node-icon";
import { Button } from "ui/button";
import { PlusIcon, Unlink } from "lucide-react";
import { NodeSelect } from "./node-select";
import { generateUniqueKey, generateUUID } from "lib/utils";
import { generateUINode } from "./shared";
import { useUpdate } from "@/hooks/use-update";

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
  const { addNodes, addEdges, updateNode } = useReactFlow();
  const nextNodes = useMemo(() => {
    const nextIds = edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => edge.target);
    return nodes.filter((node) => nextIds.includes(node.id));
  }, [edges, node.id]);
  const update = useUpdate();
  const appendNode = useCallback(
    (kind: NodeKind) => {
      const targetEdges = edges
        .filter((edge) => edge.source === node.id)
        .map((v) => v.target);
      const targetNodes = nodes.filter((node) => {
        return targetEdges.includes(node.id);
      });
      const maxY = Math.max(
        ...targetNodes.map(
          (node) => node.position.y + (node.measured?.height ?? 0),
        ),
      );
      const names = nodes.map((node) => node.data.name as string);
      const name = generateUniqueKey(kind.toUpperCase(), names);

      const newNode = generateUINode(kind, {
        name,
        position: {
          x: node.position.x + 300 * 1.2,
          y: !targetNodes.length ? node.position.y : maxY + 80,
        },
      });
      addNodes([newNode]);
      if (kind !== NodeKind.Information) {
        addEdges([
          {
            id: generateUUID(),
            source: node.id,
            target: newNode.id,
          },
        ]);
      }
      update(() => {
        updateNode(node.id, {
          selected: false,
        });
      });
    },
    [node.id, nodes, edges, addNodes],
  );
  return (
    <div className="flex flex-col w-full text-muted-foreground">
      <Label>Next Step</Label>
      <p className="my-2 text-xs">이 워크플로우에 다음 단계를 추가하세요.</p>
      <div className="flex w-full">
        <div className="py-1">
          <div className="border p-[7px] rounded-lg flex items-center">
            <NodeIcon type={node.data.kind} />
          </div>
        </div>
        <div className="py-1">
          <div className="py-[7px] flex items-center">
            <div className="w-6 h-6 flex items-center">
              <div className="h-2 w-0.5 bg-border rounded-r" />
              <div className="w-full h-[1px] bg-border" />
              <div className="h-2 w-0.5 bg-border rounded-l" />
            </div>
          </div>
        </div>

        <div className="text-xs flex-1 min-w-0 gap-1 bg-background rounded-lg p-1 flex flex-col">
          {nextNodes.map((n) => {
            return (
              <div
                className="w-full group cursor-pointer hover:bg-secondary transition-colors gap-2 border p-1.5 rounded-lg bg-card flex items-center"
                key={n.data.id}
                onClick={onSelectNode?.bind(null, n.data.id)}
              >
                <NodeIcon type={n.data.kind} />
                {n.data.name}
                <button
                  className="hover:border-destructive flex transition-colors ml-auto gap-1 border rounded  p-1 items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisconnected(n.data.id);
                  }}
                >
                  <Unlink className="size-3 group-hover:text-destructive" />
                </button>
              </div>
            );
          })}
          <NodeSelect onChange={appendNode}>
            <Button
              size={"lg"}
              variant="ghost"
              className="text-xs w-full text-muted-foreground border border-dashed justify-start"
            >
              <PlusIcon className="size-3" />
              <span>Add Next Step</span>
            </Button>
          </NodeSelect>
        </div>
      </div>
    </div>
  );
}
