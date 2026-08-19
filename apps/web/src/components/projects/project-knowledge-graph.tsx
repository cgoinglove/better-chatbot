"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { fetcher } from "@/lib/utils";
import { Badge } from "ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Skeleton } from "ui/skeleton";

type GraphNode = {
  id: string;
  kind: string;
  label: string;
  summary: string | null;
  factCount: number;
  position: { x: number; y: number };
};

type GraphResponse = {
  nodes: GraphNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label: string | null;
  }>;
  truncated: boolean;
};

export function ProjectKnowledgeGraph({ projectId }: { projectId: string }) {
  const { data, error } = useSWR<GraphResponse>(
    `/api/projects/${projectId}/brain/graph`,
    fetcher,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail } = useSWR<{
    node: GraphNode;
    facts: Array<{
      id: string;
      key: string;
      value: string;
      confidence: number;
      sourceLabel: string;
    }>;
  }>(
    selectedId?.startsWith("project:")
      ? null
      : selectedId
        ? `/api/projects/${projectId}/brain/graph/nodes/${selectedId}`
        : null,
    fetcher,
  );

  const adjacency = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const node of data?.nodes ?? [])
      result.set(node.id, new Set([node.id]));
    for (const edge of data?.edges ?? []) {
      result.get(edge.source)?.add(edge.target);
      result.get(edge.target)?.add(edge.source);
    }
    return result;
  }, [data]);

  const activeId = hoveredId ?? selectedId;
  const neighborhood = activeId ? adjacency.get(activeId) : null;

  const nodes = useMemo<Node[]>(
    () =>
      (data?.nodes ?? []).map((node) => ({
        id: node.id,
        position: node.position,
        data: {
          label: `${node.label}${node.factCount ? ` · ${node.factCount} facts` : ""}`,
        },
        style: {
          borderRadius: 12,
          borderColor:
            node.kind === "project" ? "var(--primary)" : "var(--border)",
          opacity: neighborhood && !neighborhood.has(node.id) ? 0.18 : 1,
          transition: "opacity 160ms",
        },
      })),
    [data?.nodes, neighborhood],
  );

  const edges = useMemo<Edge[]>(
    () =>
      (data?.edges ?? []).map((edge) => ({
        ...edge,
        type: "smoothstep",
        style: {
          opacity:
            activeId && edge.source !== activeId && edge.target !== activeId
              ? 0.12
              : 1,
        },
      })),
    [activeId, data?.edges],
  );

  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  if (!data) return <Skeleton className="h-[640px] w-full" />;

  if (!data.nodes.length) {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Add a document, transcript or connected tool, then sync the project.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="h-[640px] overflow-hidden rounded-xl border bg-card">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.2}
          maxZoom={1.8}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeMouseEnter={(_, node) => setHoveredId(node.id)}
          onNodeMouseLeave={() => setHoveredId(null)}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
        >
          <Background gap={18} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{detail?.node.label ?? "Knowledge graph"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedId && (
            <p className="text-sm text-muted-foreground">
              Select a node to inspect facts and sources.
            </p>
          )}
          {detail?.facts.map((fact) => (
            <div key={fact.id} className="rounded-lg border p-3 text-sm">
              <p>{fact.value}</p>
              <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{fact.key}</Badge>
                <span>{Math.round(fact.confidence * 100)}%</span>
                <span>{fact.sourceLabel}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {data.truncated && (
        <p className="text-xs text-muted-foreground">
          The largest graph nodes are shown first.
        </p>
      )}
    </div>
  );
}
