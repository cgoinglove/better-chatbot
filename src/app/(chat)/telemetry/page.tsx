"use client";

import useSWR from "swr";
import { fetcher } from "lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";

export default function TelemetryPage() {
  const { data } = useSWR<{
    events: any[];
    summary: { total: number; costUsd: number };
  }>("/api/telemetry", fetcher, { refreshInterval: 5000 });
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Telemetry</h1>
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            Total events: {data?.summary.total ?? 0}
          </div>
          <div className="text-sm">
            Cost (USD): {(data?.summary.costUsd ?? 0).toFixed(4)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data?.events ?? []).map((e, i) => (
              <div key={i} className="text-xs border rounded p-2">
                <div>
                  {new Date(e.ts).toLocaleString()} — {e.type}{" "}
                  {e.projectId ? `(${e.projectId})` : ""}
                </div>
                {e.costUsd ? <div>cost: ${e.costUsd.toFixed(6)}</div> : null}
                {e.meta ? (
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(e.meta)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
