"use client";

import { Edge } from "@xyflow/react";
import { UINode } from "lib/ai/workflow/interface";
import { ChevronRightIcon, SearchIcon, VariableIcon } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { Input } from "ui/input";

import { JSONSchema7 } from "json-schema";

interface VariableSelectProps {
  currentNodeId: string;
  nodes: UINode[];
  edges: Edge[];
  item?: {
    nodeId: string;
    path: string[];
  };
  children: React.ReactNode;
  onChange: (item: {
    nodeId: string;
    path: string[];
    nodeName: string;
    type: string;
  }) => void;
}

export function VariableSelect({
  currentNodeId,
  nodes,
  edges,
  item,
  onChange,
  children,
}: VariableSelectProps) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <VariableSelectContent
          currentNodeId={currentNodeId}
          nodes={nodes}
          edges={edges}
          item={item}
          onChange={(item) => {
            onChange(item);
            setOpen(false);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VariableSelectContent({
  currentNodeId,
  nodes,
  edges,
  onChange,
}: Omit<VariableSelectProps, "children">) {
  const [query, setQuery] = useState("");

  const accessibleSchemas = useMemo(() => {
    const accessibleNodes: string[] = [];
    let currentNodes = [currentNodeId];
    while (currentNodes.length > 0) {
      const targets = [...currentNodes];
      currentNodes = [];
      for (const target of targets) {
        const sources = edges
          .filter((edge) => edge.target === target)
          .map((edge) => edge.source);
        accessibleNodes.push(...sources);
        currentNodes.push(...sources);
      }
    }
    return nodes
      .filter((node) => accessibleNodes.includes(node.id))
      .map((node) => {
        return {
          id: node.data.id,
          name: node.data.name,
          schema: node.data.outputSchema?.properties,
          kind: node.data.kind,
        };
      })
      .filter((v) => {
        return v.schema && Object.keys(v.schema).length;
      });
  }, [nodes, currentNodeId, edges]);

  const filteredNodes = useMemo<ReactNode[]>(() => {
    return accessibleSchemas
      .map(({ name, id, schema }) => {
        const items = Array.from(Object.entries(schema ?? {}))
          .filter(([key]) => key.includes(query))
          .map(([key, schema]) => {
            return (
              <SchemaItem
                key={key}
                name={key}
                schema={schema}
                path={[]}
                onChange={(path) => {
                  onChange({
                    nodeId: id,
                    path,
                    nodeName: name,
                    type: schema.type as string,
                  });
                }}
              />
            );
          });

        if (!items.length) return null;
        return (
          <DropdownMenuGroup key={id}>
            <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
              {name}
            </DropdownMenuLabel>
            {items}
          </DropdownMenuGroup>
        );
      })
      .filter(Boolean);
  }, [accessibleSchemas, query]);
  return (
    <div className="flex flex-col w-full">
      <div
        className="flex items-center gap-1 px-2"
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
      >
        <SearchIcon className="size-4 text-muted-foreground" />
        <Input
          autoFocus
          className="border-none bg-transparent w-full"
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            e.stopPropagation();
            setQuery(e.target.value);
          }}
        />
      </div>
      <DropdownMenuSeparator />
      <div className="max-h-[50vh] overflow-y-auto flex flex-col">
        {nodes.length === 0 || filteredNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground py-4 text-xs">
              No variables found
            </p>
          </div>
        ) : (
          filteredNodes
        )}
      </div>
    </div>
  );
}

function SchemaItem({
  name,
  schema,
  path,
  onChange,
}: {
  name: string;
  schema: JSONSchema7;
  path: string[];
  onChange: (path: string[]) => void;
}) {
  if (schema.type === "object") {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          onClick={() => onChange([...path, name])}
          icon={
            <>
              <span className="text-xs text-muted-foreground ml-auto">
                {schema.type}
              </span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </>
          }
          className="text-xs text-muted-foreground flex items-center gap-1"
        >
          <VariableIcon className="size-4 text-blue-500" />
          <span className="text-foreground ml-1">{name}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="md:max-h-96 overflow-y-auto">
            {Object.entries(schema.properties ?? {}).map(([key, schema]) => {
              return (
                <SchemaItem
                  key={key}
                  name={key}
                  schema={schema as JSONSchema7}
                  path={[...path, name]}
                  onChange={onChange}
                />
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenuItem onClick={() => onChange([...path, name])}>
      <VariableIcon className="size-4 text-blue-500" />
      <span>{name}</span>
      <span className="text-xs text-muted-foreground ml-auto">
        {schema.type}
      </span>
      <div className="w-4" />
    </DropdownMenuItem>
  );
}
