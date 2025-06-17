"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { cn, generateUniqueKey, generateUUID } from "lib/utils";
import { PlusIcon } from "lucide-react";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { NodeSelect } from "./node-select";
import { NodeIcon } from "./node-icon";

import { useUpdate } from "@/hooks/use-update";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "ui/context-menu";

import { OutputSchemaStack } from "./start-node-config";
import { EndNodeOutputStack } from "./end-node-config";
import { LLMNodeStack } from "./llm-node-config";
import { NodeContextMenuContent } from "./node-context-menu-content";
import { generateUINode } from "./shared";

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
  const [openNodeSelect, setOpenNodeSelect] = useState(false);

  const {
    fitView,
    getEdges,
    addNodes,
    getNode,
    getNodes,
    addEdges,
    updateNode,
  } = useReactFlow();
  const update = useUpdate();
  const edges = getEdges();
  const nodes = getNodes() as UINode[];

  const { rightCount } = useMemo(() => {
    return {
      rightCount: edges.filter((edge) => edge.source === id).length,
    };
  }, [edges, id, nodes]);

  const appendNode = useCallback(
    (kind: NodeKind) => {
      setOpenNodeSelect(false);
      const targetEdges = edges
        .filter((edge) => edge.source === id)
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

      const node = generateUINode(kind, {
        name,
        position: {
          x: positionAbsoluteX + 300 * 1.2,
          y: !targetNodes.length ? positionAbsoluteY : maxY + 80,
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
    [
      id,
      nodes,
      edges,
      addNodes,
      positionAbsoluteX,
      positionAbsoluteY,
      width,
      rightCount,
    ],
  );

  useEffect(() => {
    if (!data.stored) {
      updateNode(id, {
        selected: true,
      });
      const node = getNode(id)!;
      if (node) {
        fitView({
          padding: 1,
          maxZoom: 1.2,
          duration: 300,
          nodes: [node],
        });
      }
    }
  }, [id]);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "fade-300 group py-4 w-72 relative bg-secondary border-2 hover:border-blue-500 rounded-lg flex flex-col cursor-grab transition-colors",
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
                data.kind == NodeKind.Start && "opacity-0",
                "h-4! border-none! bg-blue-500! w-[1px]! -left-[4px]! rounded-l-xs! rounded-r-none!",
              )}
              position={Position.Left}
              isConnectable={isConnectable}
            />
            <NodeIcon type={data.kind} />
            <div className="font-bold truncate">{data.name}</div>
            {![NodeKind.Information, NodeKind.End].includes(data.kind) && (
              <Handle
                type="source"
                onConnect={() => update()}
                position={Position.Right}
                className={cn(
                  !selected && !rightCount && "opacity-0",
                  "-right-[5px]! z-10 group-hover:opacity-100 border-none! bg-blue-500! h-4! rounded-l-none! rounded-r-xs! ",
                  "group-hover:w-4! group-hover:rounded-full! group-hover:h-4! group-hover:-right-0!",
                  selected && "w-4! rounded-full! -right-0!",
                )}
                id="right"
                isConnectable={isConnectable}
                onMouseUp={() => {
                  setOpenNodeSelect(true);
                }}
              >
                <div className="pointer-events-none">
                  <NodeSelect
                    onChange={appendNode}
                    open={openNodeSelect}
                    onOpenChange={(open) => {
                      setOpenNodeSelect(open);
                    }}
                  >
                    <PlusIcon
                      className={cn(
                        "size-4 hidden group-hover:block",
                        selected && "block",
                      )}
                    />
                  </NodeSelect>
                </div>
              </Handle>
            )}
          </div>
          <div>
            {data.kind === NodeKind.Start && <OutputSchemaStack data={data} />}
            {data.kind === NodeKind.End && (
              <EndNodeOutputStack data={data} nodes={nodes} />
            )}
            {data.kind === NodeKind.LLM && <LLMNodeStack data={data} />}
            {data.description && (
              <div className="px-4 mt-2">
                <div className="text-xs text-muted-foreground">
                  <p className="break-all whitespace-pre-wrap">
                    {data.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="p-2">
        <NodeContextMenuContent node={data} />
      </ContextMenuContent>
    </ContextMenu>
  );
});
