"use client";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { cn, generateUUID } from "lib/utils";
import { PlusIcon } from "lucide-react";

import { memo, useCallback, useEffect, useMemo } from "react";
import { NodeSelect } from "./node-select";
import { NodeIcon } from "./node-icon";
import { generateInitialNode } from "./helper";
import { useUpdate } from "@/hooks/use-update";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "ui/context-menu";

type Props = NodeProps<UINode>;

export const DefaultNode = memo(function DefaultNode({
  data,
  isConnectable,
  selected,
  id,
  positionAbsoluteX,
  positionAbsoluteY,
  width,
}: Props) {
  const { getEdges, addNodes, getNodes, addEdges, updateNode, setNodes } =
    useReactFlow();
  const update = useUpdate();
  const edges = getEdges();

  const { leftCount, rightCount } = useMemo(() => {
    return {
      leftCount: edges.filter((edge) => edge.target === id).length,
      rightCount: edges.filter((edge) => edge.source === id).length,
    };
  }, [edges, id]);

  const appendNode = useCallback(
    (kind: NodeKind) => {
      const targetNodes = getEdges()
        .filter((edge) => edge.source === id)
        .map((v) => v.target);
      const nodes = getNodes().filter((node) => {
        return targetNodes.includes(node.id);
      });
      const maxY = Math.max(
        ...nodes.map((node) => node.position.y + (node.measured?.height ?? 0)),
      );

      const node = generateInitialNode(kind, {
        position: {
          x: positionAbsoluteX + 300 * 1.2,
          y: !nodes.length ? positionAbsoluteY : maxY + 80,
        },
      });
      addNodes([node]);
      if (kind !== NodeKind.Information) {
        addEdges([
          {
            id: generateUUID(),
            source: id,
            target: node.id,
          },
        ]);
      }
      update(() => {
        updateNode(id, {
          selected: false,
        });
      });
    },
    [id, addNodes, positionAbsoluteX, positionAbsoluteY, width, rightCount],
  );

  useEffect(() => {
    if (!data.stored) {
      updateNode(id, {
        selected: true,
      });
    }
  }, []);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "group py-4 w-72 relative bg-secondary border hover:border-blue-500 rounded-lg flex flex-col cursor-grab transition-colors",
            selected && "border-blue-500",
            data.kind === NodeKind.Information &&
              "bg-primary-foreground text-primary rounded-none border-card",
          )}
        >
          <div className="flex items-center gap-2 relative px-4">
            <Handle
              id="left"
              type="target"
              className={cn(
                !leftCount && "opacity-0",
                "h-3! rounded-none! border-none! bg-blue-500! w-[1px]! -left-[3px]!",
              )}
              position={Position.Left}
              isConnectable={isConnectable}
            />
            <NodeIcon type={data.kind} />
            <div className="font-bold truncate">{data.name}</div>
            {![NodeKind.Information, NodeKind.End].includes(data.kind) && (
              <Handle
                type="source"
                position={Position.Right}
                className={cn(
                  !rightCount && "opacity-0",
                  "group-hover:opacity-100 h-3! rounded-none! border-none! bg-blue-500! w-[1px]! -right-[3px]!",
                )}
                id="right"
                isConnectable={isConnectable}
              >
                <NodeSelect onChange={appendNode}>
                  <div
                    className={cn(
                      "fade-in animate-in duration-300  hidden p-1 absolute bg-blue-500 -left-3 -top-2 rounded-full group-hover:block",
                      selected && "block",
                    )}
                  >
                    <PlusIcon className="size-4" />
                  </div>
                </NodeSelect>
              </Handle>
            )}
          </div>
          {data.description && (
            <div className="px-4 py-2">
              <div className="text-xs text-muted-foreground">
                <p className="break-all whitespace-pre-wrap">
                  {data.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            setNodes((nodes) => nodes.filter((node) => node.id !== id));
          }}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
