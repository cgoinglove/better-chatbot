"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { cn, generateUniqueKey, generateUUID } from "lib/utils";
import { PlusIcon } from "lucide-react";

import { memo, useCallback, useEffect, useState } from "react";
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
import { ConditionNodeOutputStack } from "./condition-node-config";

type Props = NodeProps<UINode>;

export const DefaultNode = memo(function DefaultNode({
  data,
  isConnectable,
  selected,
  id,
  positionAbsoluteX,
  positionAbsoluteY,
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
    [id, nodes, edges, addNodes, positionAbsoluteX, positionAbsoluteY],
  );

  useEffect(() => {
    if (data.runtime?.isNew) {
      updateNode(id, {
        selected: true,
      });
      const node = getNode(id)!;
      if (node) {
        fitView({
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
            "fade-300 group py-4 w-72 relative bg-secondary border-2 hover:bg-input rounded-lg flex flex-col cursor-grab transition-colors",
            selected && "border-blue-500 bg-secondary!",
            data.kind === NodeKind.Information &&
              "bg-primary-foreground text-primary rounded-none border-card",
            data.kind === NodeKind.Condition && "w-52",
          )}
        >
          <div className="flex items-center gap-2 relative px-4">
            {![NodeKind.Information, NodeKind.Start].includes(data.kind) && (
              <Handle
                id="left"
                type="target"
                className={cn(
                  "h-4! border-none! bg-blue-500! w-[1px]! -left-[4px]! rounded-l-xs! rounded-r-none!",
                )}
                position={Position.Left}
                isConnectable={isConnectable}
              />
            )}
            <NodeIcon type={data.kind} />
            <div className="font-bold truncate">{data.name}</div>
            {![NodeKind.Information, NodeKind.End, NodeKind.Condition].includes(
              data.kind,
            ) && (
              <Handle
                type="source"
                onConnect={() => update()}
                position={Position.Right}
                className="z-10 border-none! -right-0! bg-transparent! w-4! h-4!"
                id="right"
                isConnectable={isConnectable}
                onMouseUp={() => {
                  setOpenNodeSelect(true);
                }}
              >
                <div className={cn("pointer-events-none relative")}>
                  <div
                    className={cn(
                      "flex w-full h-full z-20 pl-2.5",
                      "group-hover:hidden",
                      selected && "hidden",
                    )}
                  >
                    <div className="h-4 w-1.5 bg-blue-500 rounded-r-xs"></div>
                  </div>
                  <NodeSelect
                    onChange={appendNode}
                    open={openNodeSelect}
                    onOpenChange={(open) => {
                      setOpenNodeSelect(open);
                    }}
                  >
                    <div
                      className={cn(
                        "items-center justify-center bg-blue-500 rounded-full w-5 h-5 hidden translate-x -translate-y-0.5",
                        "group-hover:flex",
                        selected && "flex",
                      )}
                    >
                      <PlusIcon className={"size-4 text-white stroke-4"} />
                    </div>
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
            {data.kind === NodeKind.Condition && (
              <ConditionNodeOutputStack data={data} />
            )}
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
