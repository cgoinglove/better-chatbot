"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "ui/input";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { Separator } from "ui/separator";

type Preset = {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  inputs?: Record<string, any>;
};

export default function BuildFromPromptPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] =
    useState<string>("codegen-webapp");
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [useOrchestrator, setUseOrchestrator] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/workflow/presets")
      .then((r) => r.json())
      .then((data) => setPresets(Array.isArray(data) ? data : []))
      .catch(() => setPresets([]));
  }, []);

  const run = async () => {
    if (running) return;
    setLogs("");
    setRunning(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const preset = presets.find((p) => p.id === selectedPreset) || presets[0];
      if (!preset) throw new Error("No preset available");

      if (useOrchestrator) {
        const res = await fetch("/api/orchestrator/run", {
          method: "POST",
          body: JSON.stringify({ prompt }),
          signal: abortRef.current.signal,
        });
        if (!res.ok || !res.body) throw new Error("Failed to run orchestrator");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setLogs((prev) => prev + chunk);
        }
        return;
      }

      // 1) create workflow
      const createRes = await fetch("/api/workflow", {
        method: "POST",
        body: JSON.stringify({ name: preset.name, isPublished: true }),
      });
      if (!createRes.ok) throw new Error("Failed to create workflow");
      const wf = await createRes.json();

      // 2) set structure
      const structRes = await fetch(`/api/workflow/${wf.id}/structure`, {
        method: "POST",
        body: JSON.stringify({ nodes: preset.nodes, edges: preset.edges }),
      });
      if (!structRes.ok) throw new Error("Failed to set workflow structure");

      // 3) execute (stream)
      const execRes = await fetch(`/api/workflow/${wf.id}/execute`, {
        method: "POST",
        body: JSON.stringify({ query: { prompt } }),
        signal: abortRef.current.signal,
      });
      if (!execRes.ok || !execRes.body) throw new Error("Failed to execute");

      const reader = execRes.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setLogs((prev) => prev + chunk);
      }
    } catch (e: any) {
      setLogs((prev) => prev + `\n[ERROR] ${e?.message || "Unknown error"}`);
    } finally {
      setRunning(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Build from Prompt</h1>
      <Card>
        <CardHeader>
          <CardTitle>Plan → Scaffold → Test → Fix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label>Preset</Label>
              <select
                className="h-9 rounded-md border px-2 bg-background"
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Prompt</Label>
              <Input
                placeholder="Describe what to build..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={run} disabled={running || !presets.length}>
              {running ? "Running..." : "Run"}
            </Button>
            <Button variant="outline" onClick={stop} disabled={!running}>
              Stop
            </Button>
            <label className="ml-2 text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={useOrchestrator}
                onChange={(e) => setUseOrchestrator(e.target.checked)}
              />
              Use Orchestrator
            </label>
          </div>
          <Separator />
          <div>
            <Label>Logs</Label>
            <Textarea
              className="font-mono h-[50vh] mt-2"
              readOnly
              value={logs}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
