"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { NodeKind, UINode, WorkflowNode } from "lib/ai/workflow/interface";
import { cn, generateUUID } from "lib/utils";
import { PlusIcon, VariableIcon } from "lucide-react";

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
import { getFieldKey } from "../edit-json-schema-field-popup";
import { OutputSchemaStack } from "./start-node-config";
import { EndNodeOutputStack } from "./end-node-config";

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
  const nodes = getNodes() as UINode[];
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
                !leftCount && "opacity-0",
                "h-4! rounded-none! border-none! bg-blue-500! w-[1px]! -left-[4px]!",
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
                  !selected && !rightCount && "opacity-0",
                  "-right-[5px]! z-10 group-hover:opacity-100 border-none! bg-blue-500! rounded-none! h-4!",
                  "group-hover:w-4! group-hover:rounded-full! group-hover:h-4! group-hover:-right-0!",
                  selected && "w-4! rounded-full! -right-0!",
                )}
                id="right"
                isConnectable={isConnectable}
              >
                <NodeSelect onChange={appendNode}>
                  <PlusIcon
                    className={cn(
                      "size-4 hidden group-hover:block",
                      selected && "block",
                    )}
                  />
                </NodeSelect>
              </Handle>
            )}
          </div>
          {data.kind === NodeKind.Start && <OutputSchemaStack data={data} />}
          {data.kind === NodeKind.End && (
            <EndNodeOutputStack data={data} nodes={nodes} />
          )}
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
